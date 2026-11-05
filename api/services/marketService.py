from datetime import datetime, timezone
import logging
import re
import time
from typing import Any, Dict, List, Optional

import requests
import urllib3

try:
    from api.schemas import MarketDataResult
except ImportError:  # pragma: no cover - compatibility for local execution
    from schemas import MarketDataResult

logger = logging.getLogger(__name__)

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
}

# Cache em memória para P/VP (TTL de 3 horas para máxima velocidade e 0 overhead)
_PVP_CACHE: Dict[str, float] = {}
_LAST_PVP_FETCH: float = 0.0

def _refresh_pvp_cache():
    global _PVP_CACHE, _LAST_PVP_FETCH
    now = time.time()
    # Se o cache tiver menos de 3 horas, reutiliza instantaneamente
    if _PVP_CACHE and (now - _LAST_PVP_FETCH < 10800):
        return

    try:
        session = requests.Session()
        session.headers.update(DEFAULT_HEADERS)
        urllib3.disable_warnings()

        new_cache = {}

        # 1. Puxa P/VP de todos os FIIs da B3 em 1 única requisição
        try:
            r_fii = session.get("https://www.fundamentus.com.br/fii_resultado.php", verify=False, timeout=6)
            if r_fii.status_code == 200:
                rows = re.findall(r'<tr[^>]*>(.*?)</tr>', r_fii.text, re.DOTALL)
                for row in rows:
                    cols = [re.sub(r'<[^>]+>', '', c).strip() for c in re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)]
                    if len(cols) >= 6:
                        ticker = cols[0].upper().strip()
                        try:
                            val = float(cols[5].replace('.', '').replace(',', '.'))
                            new_cache[ticker] = val
                        except ValueError:
                            pass
        except Exception as e:
            logger.warning("Falha ao atualizar P/VP de FIIs: %s", e)

        # 2. Puxa P/VP de todas as Ações da B3 em 1 única requisição
        try:
            r_acao = session.get("https://www.fundamentus.com.br/resultado.php", verify=False, timeout=6)
            if r_acao.status_code == 200:
                rows = re.findall(r'<tr[^>]*>(.*?)</tr>', r_acao.text, re.DOTALL)
                for row in rows:
                    cols = [re.sub(r'<[^>]+>', '', c).strip() for c in re.findall(r'<td[^>]*>(.*?)</td>', row, re.DOTALL)]
                    if len(cols) >= 4:
                        ticker = cols[0].upper().strip()
                        try:
                            val = float(cols[3].replace('.', '').replace(',', '.'))
                            new_cache[ticker] = val
                        except ValueError:
                            pass
        except Exception as e:
            logger.warning("Falha ao atualizar P/VP de Ações: %s", e)

        if new_cache:
            _PVP_CACHE.update(new_cache)
            _LAST_PVP_FETCH = now
            logger.info("Cache de P/VP atualizado com sucesso. Total ativos: %d", len(_PVP_CACHE))

    except Exception as exc:
        logger.error("Erro ao sincronizar P/VP geral: %s", exc)

def _should_append_sa(symbol: str) -> bool:
    sym = symbol.upper()
    if sym.endswith(".SA"):
        return False
    if "." in sym:
        return False
    if any(ch.isdigit() for ch in sym):
        return True
    if sym.isalpha() and len(sym) >= 5:
        return True
    return False

def _build_query_symbol(original: str) -> str:
    if _should_append_sa(original):
        return f"{original}.SA"
    return original

def _fetch_chart_payload(session: requests.Session, query_symbol: str) -> Optional[Dict[str, Any]]:
    endpoints = [
        f"https://query1.finance.yahoo.com/v8/finance/chart/{query_symbol}?interval=1d&range=2y&events=div",
        f"https://query2.finance.yahoo.com/v8/finance/chart/{query_symbol}?interval=1d&range=2y&events=div"
    ]
    
    for url in endpoints:
        try:
            response = session.get(url, headers=DEFAULT_HEADERS, timeout=6)
            response.raise_for_status()
            payload = response.json()
            chart = payload.get("chart") or {}
            result = (chart.get("result") or [])
            if result:
                return result[0]
        except Exception:
            try:
                urllib3.disable_warnings()
                response = session.get(url, headers=DEFAULT_HEADERS, timeout=6, verify=False)
                if response.status_code == 200:
                    payload = response.json()
                    chart = payload.get("chart") or {}
                    result = (chart.get("result") or [])
                    if result:
                        return result[0]
            except Exception as exc:
                logger.warning("Falha ao consultar Yahoo Finance Chart para %s: %s", query_symbol, exc)
                
    return None

def get_market_data(symbols: List[str]) -> Dict[str, MarketDataResult]:
    if not symbols:
        return {}

    # Atualiza em lote o P/VP de todos os ativos da bolsa
    _refresh_pvp_cache()

    mapping = {symbol: _build_query_symbol(symbol) for symbol in symbols}
    session = requests.Session()
    session.headers.update(DEFAULT_HEADERS)

    results: Dict[str, MarketDataResult] = {}
    now_timestamp = int(datetime.now(timezone.utc).timestamp())
    one_year_ago_timestamp = now_timestamp - (365 * 24 * 60 * 60)

    for original_symbol, query_symbol in mapping.items():
        clean_base_ticker = original_symbol.upper().replace(".SA", "").strip()
        price: Optional[float] = None
        change_percent: Optional[float] = None
        yieldpct = 0.0
        paid_months: List[int] = []
        pvp_value: Optional[float] = _PVP_CACHE.get(clean_base_ticker)

        try:
            result = _fetch_chart_payload(session, query_symbol)
            if not result:
                results[original_symbol] = MarketDataResult(
                    ticker=original_symbol,
                    price=None,
                    changePercent=None,
                    yieldpct=0.0,
                    paidMonths=[],
                    priceToBook=pvp_value,
                )
                continue

            meta = result.get("meta") or {}
            price_value = meta.get("regularMarketPrice")
            if price_value is not None:
                price = float(price_value)

            # Variação diária
            indicators = result.get("indicators") or {}
            quote_list = indicators.get("quote") or [{}]
            closes = quote_list[0].get("close") or []
            valid_closes = [c for c in closes if c is not None]

            if price is not None and len(valid_closes) >= 2:
                previous_close = valid_closes[-2]
                if previous_close:
                    change_percent = ((price - previous_close) / previous_close) * 100
            elif meta.get("chartPreviousClose") and price is not None:
                prev = float(meta["chartPreviousClose"])
                change_percent = ((price - prev) / prev) * 100

            # Proventos (dividendos)
            events = result.get("events") or {}
            dividends = events.get("dividends") or {}

            total_dividends_1y = 0.0
            paid_months_set = set()

            for ts_str, div_data in dividends.items():
                try:
                    ts = int(ts_str)
                    amount = float(div_data.get("amount", 0.0))
                    
                    div_date = datetime.fromtimestamp(ts, timezone.utc)
                    # Histórico de até 2 anos para preencher a recorrência dos meses pagos (Div + JCP)
                    paid_months_set.add(div_date.month)

                    # Soma para o cálculo de Yield Anual estritamente os últimos 365 dias
                    if ts >= one_year_ago_timestamp:
                        total_dividends_1y += amount
                except (ValueError, TypeError):
                    continue

            if price and price > 0:
                yieldpct = (total_dividends_1y / price) * 100

            paid_months = sorted(list(paid_months_set))

            results[original_symbol] = MarketDataResult(
                ticker=original_symbol,
                price=price,
                changePercent=change_percent,
                yieldpct=yieldpct,
                paidMonths=paid_months,
                priceToBook=pvp_value,
            )

        except Exception as exc:
            logger.error("Erro inesperado ao processar %s: %s", original_symbol, exc)
            results[original_symbol] = MarketDataResult(
                ticker=original_symbol,
                price=None,
                changePercent=None,
                yieldpct=0.0,
                paidMonths=[],
                priceToBook=pvp_value,
            )

    return results
