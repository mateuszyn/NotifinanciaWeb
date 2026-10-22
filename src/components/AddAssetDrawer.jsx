import React, { useState, useEffect, useRef } from 'react';
import { TickerDictionary } from '../utils/ticker-dictionary.js';
import { AssetService } from '../services/asset-service.js';

export default function AddAssetDrawer({ onAddAsset, existingTickers = [] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [ticker, setTicker] = useState('');
    const [quantity, setQuantity] = useState('');
    const [averagePrice, setAveragePrice] = useState('');
    
    const [suggestions, setSuggestions] = useState([]);
    const [snowballInfo, setSnowballInfo] = useState(null);
    const [isLoadingPrice, setIsLoadingPrice] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validatedTickers, setValidatedTickers] = useState(new Set());
    const suggestionsRef = useRef(null);
    const snowballInfoRef = useRef(null);
    const [isSnowballInfoOpen, setIsSnowballInfoOpen] = useState(false);

    // Recalcula o custo da bola de neve sempre que mudar o P. Médio ou o yield detectado
    const priceNum = parseFloat(averagePrice) || 0;
    const snowballCost = (snowballInfo && priceNum > 0) ? (snowballInfo * priceNum).toFixed(2) : null;
    const quantityNum = parseFloat(quantity) || 0;
    const currentTotalApprox = (quantityNum > 0 && priceNum > 0) ? (quantityNum * priceNum).toFixed(2) : null;

    // Filter suggestions when ticker changes
    useEffect(() => {
        const query = ticker.trim().toUpperCase();
        if (!query) {
            setSnowballInfo(null);
            setSuggestions([]);
            return;
        }

        if (query.length >= 2) {
            const results = TickerDictionary.search(query).slice(0, 5);
            setSuggestions(results);
        } else {
            setSuggestions([]);
        }
    }, [ticker]);

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(e.target)) {
                setSuggestions([]);
            }
            if (snowballInfoRef.current && !snowballInfoRef.current.contains(e.target)) {
                setIsSnowballInfoOpen(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    const toggleDrawer = () => setIsOpen(!isOpen);

    const handleQuickQty = (delta) => {
        setQuantity(prev => {
            const current = parseFloat(prev) || 0;
            return Math.max(0, current + delta).toString();
        });
    };

    const fetchCurrentPrice = async () => {
        const cleanTicker = ticker.toUpperCase().trim();
        if (!cleanTicker || cleanTicker.length < 4) {
            window.Swal.fire({ icon: 'error', title: 'Erro', text: 'Informe um ticker válido antes de buscar o valor atual.' });
            return;
        }

        setIsLoadingPrice(true);
        try {
            const data = await AssetService.getPrice(cleanTicker);
            if (!data || data.price <= 0) throw new Error('Não foi possível obter o valor atual.');

            setAveragePrice(data.price.toFixed(2));
            setValidatedTickers(prev => new Set(prev).add(cleanTicker));

            const yieldAnual = Number(data.yieldPct || 0);
            if (yieldAnual > 0) {
                const rendaMensal = (data.price * (yieldAnual / 100)) / 12;
                setSnowballInfo(rendaMensal > 0 ? Math.ceil(data.price / rendaMensal) : 0);
            } else {
                setSnowballInfo(null);
            }
        } catch (error) {
            window.Swal.fire({ icon: 'error', title: 'Erro', text: error.message });
        } finally {
            setIsLoadingPrice(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const cleanTicker = ticker.toUpperCase().trim();
        const qtyValue = Number(quantity);
        const priceValue = parseFloat(averagePrice);

        if (!cleanTicker || !qtyValue || !priceValue) {
            window.Swal.fire({ icon: 'error', title: 'Erro', text: 'Preencha o Ticker, a Quantidade e o Preço Médio.' });
            return;
        }

        // Validação contra ativos duplicados na carteira
        if (existingTickers && existingTickers.some(t => t.toUpperCase() === cleanTicker)) {
            window.Swal.fire({ 
                icon: 'warning', 
                title: 'Ativo já cadastrado', 
                text: `O ativo ${cleanTicker} já está cadastrado na sua carteira. Edite a quantidade existente em vez de adicionar outro.` 
            });
            return;
        }

        setIsSubmitting(true);
        window.Swal.fire({ title: 'Salvando na carteira...', allowOutsideClick: false, didOpen: () => window.Swal.showLoading() });

        try {
            if (!validatedTickers.has(cleanTicker)) {
                window.Swal.update({ title: 'Buscando e validando ativo...' });
                const isValid = await AssetService.validateTicker(cleanTicker);
                if (!isValid) {
                    window.Swal.fire({ icon: 'error', title: 'Erro', text: `O ticker "${cleanTicker}" não foi encontrado na B3.` });
                    setIsSubmitting(false);
                    return;
                }
                setValidatedTickers(prev => new Set(prev).add(cleanTicker));
                window.Swal.update({ title: 'Salvando na carteira...' });
            }

            const result = await onAddAsset({ ticker: cleanTicker, quantity: qtyValue, averagePrice: priceValue });

            // Limpa form e fecha gaveta
            setTicker('');
            setQuantity('');
            setAveragePrice('');
            setSnowballInfo(null);
            setIsOpen(false);
            
            window.Swal.fire({
                icon: result?.tickerDiscoveryFailed ? 'warning' : 'success',
                title: result?.tickerDiscoveryFailed ? 'Ativo salvo' : 'Sucesso!',
                text: result?.tickerDiscoveryFailed
                    ? `O ativo foi adicionado à carteira, mas não foi possível registrar ${cleanTicker} como ticker descoberto.`
                    : `${cleanTicker} adicionado com sucesso!`,
                timer: result?.tickerDiscoveryFailed ? undefined : 2000,
                showConfirmButton: result?.tickerDiscoveryFailed
            });
        } catch (error) {
            window.Swal.fire({ icon: 'error', title: 'Erro', text: 'Erro ao processar sua solicitação.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={`bottom-drawer ${isOpen ? '' : 'collapsed'}`}>
            <div className="drawer-header" onClick={toggleDrawer} style={{ cursor: 'pointer' }}>
                <div className="drag-handle mx-auto"></div>
                <button
                    type="button"
                    className="fake-add-btn"
                    aria-expanded={isOpen}
                    aria-label={isOpen ? "Fechar gaveta de novo ativo" : "Abrir gaveta de novo ativo"}
                >
                    <i className={`bi ${isOpen ? 'bi-chevron-down' : 'bi-plus-lg'} me-1`} aria-hidden="true"></i>
                    {isOpen ? 'FECHAR' : 'NOVO ATIVO'}
                </button>
            </div>
            
            <div className="drawer-content px-3">
                <form id="form-asset" className="mt-2" onSubmit={handleSubmit}>
                    <div className="row g-2 align-items-end">
                        
                        {/* Ticker Input */}
                        <div className="col-12 col-md-3 form-group mb-2 position-relative" ref={suggestionsRef}>
                            <label className="small text-secondary fw-bold mb-1">Ticker</label>
                            <input 
                                type="text" 
                                className="form-control bg-black text-white border-secondary text-uppercase" 
                                placeholder="Ex: PETR4" 
                                required
                                value={ticker}
                                onChange={(e) => setTicker(e.target.value)}
                            />
                            {suggestions.length > 0 && (
                                <ul
                                    className="dropdown-menu w-100 shadow-lg bg-dark border-secondary"
                                    style={{
                                        display: 'block',
                                        position: 'absolute',
                                        bottom: '100%',
                                        top: 'auto',
                                        marginBottom: '6px',
                                        zIndex: 1050,
                                        maxHeight: '220px',
                                        overflowY: 'auto'
                                    }}
                                >
                                    {suggestions.map((s, idx) => (
                                        <li key={idx}>
                                            <a 
                                                className="dropdown-item ticker-suggestion-item text-white border-bottom border-secondary py-2 cursor-pointer hover-bg-light"
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setTicker(s);
                                                    setSuggestions([]);
                                                }}
                                            >
                                                {s}{TickerDictionary.getName(s) ? ` — ${TickerDictionary.getName(s)}` : ''}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Average Price Input */}
                        <div className="col-6 col-md-3 mb-2">
                            <label className="small text-secondary fw-bold mb-1">P. Médio (R$)</label>
                            <div className="input-group input-group-sm">
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    className="form-control bg-black text-white border-secondary" 
                                    placeholder={isLoadingPrice ? "Buscando..." : "0.00"}
                                    value={averagePrice}
                                    onChange={(e) => setAveragePrice(e.target.value)}
                                />
                                <button 
                                    type="button" 
                                    className="btn btn-outline-primary px-2" 
                                    title="Preencher com o valor atual"
                                    onClick={fetchCurrentPrice}
                                    disabled={isLoadingPrice}
                                >
                                    {isLoadingPrice ? <i className="bi bi-arrow-repeat spin-animation"></i> : '$ Atual'}
                                </button>
                            </div>
                        </div>

                        {/* Quantity Input */}
                        <div className="col-6 col-md-4 mb-2">
                            <div className="small text-secondary fw-bold mb-1 d-flex align-items-center gap-2 flex-wrap">
                                <label htmlFor="asset-quantity" className="mb-0">Quantidade</label>
                                {snowballInfo && (
                                    <span className="snowball-info-message">
                                        <span className="snowball-info-wrapper" ref={snowballInfoRef}>
                                            <button
                                                type="button"
                                                className="snowball-info-button"
                                                aria-label="Informações sobre a meta Bola de Neve"
                                                aria-expanded={isSnowballInfoOpen}
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    setIsSnowballInfoOpen(open => !open);
                                                }}
                                            >
                                                <i className="bi bi-info-circle-fill" aria-hidden="true"></i>
                                            </button>
                                            {isSnowballInfoOpen && (
                                                <span className="snowball-info-popover" role="tooltip">
                                                    Meta estimada de cotas para receber proventos suficientes para comprar aproximadamente uma nova cota por mês. O cálculo usa o DY disponível e não garante rendimentos futuros.
                                                </span>
                                            )}
                                        </span>
                                        <span style={{ color: '#8fe3a7', fontSize: '0.82em' }}>
                                            Bola de Neve: {snowballInfo} cotas {snowballCost && `≈ R$ ${snowballCost}`}
                                        </span>
                                    </span>
                                )}
                            </div>
                            <div className="quantity-entry-box">
                                <div className="quantity-input-row">
                                    <input
                                        id="asset-quantity"
                                        type="number"
                                        className="form-control bg-black text-white border-secondary quantity-input"
                                        placeholder="0"
                                        step="any"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                    />
                                    {currentTotalApprox && (
                                        <span className="quantity-estimate" aria-live="polite">
                                            ≈ R$ {currentTotalApprox}
                                        </span>
                                    )}
                                    <div className="quantity-stepper">
                                        <button type="button" aria-label="Aumentar uma cota" onClick={() => handleQuickQty(1)}>
                                            <i className="bi bi-chevron-up" aria-hidden="true"></i>
                                        </button>
                                        <button type="button" aria-label="Diminuir uma cota" onClick={() => handleQuickQty(-1)}>
                                            <i className="bi bi-chevron-down" aria-hidden="true"></i>
                                        </button>
                                    </div>
                                    <div className="quantity-quick-controls">
                                        <button type="button" className="btn btn-dark border-secondary" onClick={() => handleQuickQty(10)}>+10</button>
                                        <button type="button" className="btn btn-dark border-secondary" onClick={() => handleQuickQty(100)}>+100</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="col-12 col-md-2 mb-2">
                            <label className="small d-block mb-1" style={{ visibility: 'hidden' }}>Confirmar</label>
                            <button type="submit" className="btn btn-success w-100 fw-bold btn-sm py-2" style={{ height: '40px' }} disabled={isSubmitting}>
                                ADICIONAR
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
