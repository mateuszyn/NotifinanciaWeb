from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class PingResponse(BaseModel):
    status: str


class MarketDataResult(BaseModel):
    ticker: str
    price: Optional[float] = None
    changePercent: Optional[float] = None
    yieldpct: float = 0.0
    paidMonths: List[int] = Field(default_factory=list)
    priceToBook: Optional[float] = None


class MarketDataResponse(BaseModel):
    results: Dict[str, MarketDataResult]
