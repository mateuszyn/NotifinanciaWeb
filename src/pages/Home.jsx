import React, { useState, useMemo } from 'react';
import { TICKER_DATA } from '../utils/ticker-data.js';

export default function Home({ onSelectAsset, onOpenAI }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL'); // ALL, Ação, FII, Fiagro

    // Filtragem otimizada dos tickers para a barra de pesquisa global
    const filteredTickers = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const term = searchTerm.toLowerCase();
        
        return Object.entries(TICKER_DATA)
            .filter(([ticker, data]) => {
                const matchesSearch = ticker.toLowerCase().includes(term) || data.name.toLowerCase().includes(term) || data.segment.toLowerCase().includes(term);
                const matchesType = selectedTypeFilter === 'ALL' || data.type === selectedTypeFilter;
                return matchesSearch && matchesType;
            })
            .slice(0, 8); // Limita a 8 resultados para manter a UI leve
    }, [searchTerm, selectedTypeFilter]);

    // Seleção dinâmica ou destacada de ativos para os Destaques do Dia (Ex: BESST + FIIs)
    const highlightedTickers = ['BBAS3', 'TAEE3', 'CMIG4', 'HGLG11', 'MXRF11'];

    return (
        <div className="container py-4 text-light">
            {/* Secção de Boas-Vindas e Pesquisa Global */}
            <div className="text-center mb-5">
                <h1 className="fw-bold mb-2">Notifinancia <span className="text-success">Smart Hub</span></h1>
                <p className="text-secondary mb-4">Consulte ativos da B3, acompanhe dividendos e simule a sua estratégia de longo prazo com IA.</p>
                
                <div className="row justify-content-center">
                    <div className="col-md-8 position-relative">
                        <div className="input-group input-group-lg bg-dark border border-secondary rounded-pill overflow-hidden shadow-sm">
                            <span className="input-group-text bg-transparent border-0 text-secondary ps-4">
                                <i className="bi bi-search"></i>
                            </span>
                            <input 
                                type="text"
                                className="form-control bg-transparent text-light border-0 shadow-none"
                                placeholder="Pesquise por ticker (ex: PETR3, KNRI11) ou empresa..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button className="btn btn-link text-secondary pe-3 border-0" onClick={() => setSearchTerm('')}>
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            )}
                        </div>

                        {/* Dropdown de Resultados da Pesquisa Global */}
                        {filteredTickers.length > 0 && (
                            <div className="position-absolute w-100 bg-dark border border-secondary rounded-3 mt-2 shadow-lg text-start z-3 overflow-hidden">
                                {filteredTickers.map(([ticker, data]) => (
                                    <div 
                                        key={ticker}
                                        className="p-3 border-bottom border-secondary d-flex justify-content-between align-items-center hover-bg-dark cursor-pointer transition"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => {
                                            if (onSelectAsset) onSelectAsset(ticker);
                                            setSearchTerm('');
                                        }}
                                    >
                                        <div>
                                            <span className="fw-bold text-success me-2">{ticker}</span>
                                            <span className="text-light small">{data.name}</span>
                                        </div>
                                        <span className="badge bg-secondary text-light small">{data.segment}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Filtros rápidos de tipo */}
                <div className="d-flex justify-content-center gap-2 mt-3">
                    {['ALL', 'Ação', 'FII', 'Fiagro'].map((type) => (
                        <button
                            key={type}
                            className={`btn btn-sm rounded-pill px-3 ${selectedTypeFilter === type ? 'btn-success' : 'btn-outline-secondary'}`}
                            onClick={() => setSelectedTypeFilter(type)}
                        >
                            {type === 'ALL' ? 'Todos' : type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Secção de Destaques Dinâmicos do Mercado */}
            <div className="mb-5">
                <h3 className="h5 fw-bold mb-3 d-flex align-items-center gap-2">
                    <i className="bi bi-lightning-charge-fill text-warning"></i> Destaques do Ecossistema & FIIs
                </h3>
                <div className="row g-3">
                    {highlightedTickers.map((ticker) => {
                        const assetMeta = TICKER_DATA[ticker];
                        if (!assetMeta) return null;
                        return (
                            <div key={ticker} className="col-md-4 col-sm-6">
                                <div className="card bg-dark border border-secondary p-3 h-100 shadow-sm hover-card">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h5 className="fw-bold m-0 text-success">{ticker}</h5>
                                        <span className="badge bg-black border border-secondary text-secondary small">
                                            {assetMeta.type}
                                        </span>
                                    </div>
                                    <p className="text-secondary small mb-3 text-truncate">{assetMeta.name}</p>
                                    <div className="mt-auto d-flex justify-content-between align-items-center">
                                        <span className="small text-muted">{assetMeta.segment}</span>
                                        <button 
                                            className="btn btn-sm btn-outline-light rounded-pill px-3"
                                            onClick={() => onSelectAsset && onSelectAsset(ticker)}
                                        >
                                            Ver Detalhes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Banner de Ação / Simulação com IA */}
            <div className="p-4 rounded-4 bg-gradient border border-secondary d-flex flex-column flex-md-row justify-content-between align-items-center gap-3" style={{ background: 'linear-gradient(135deg, #1a1d20 0%, #111315 100%)' }}>
                <div>
                    <h4 className="fw-bold mb-1 text-white">Precisa de ajuda para montar sua estratégia Barsi?</h4>
                    <p className="text-secondary mb-0 small">Deixe a nossa IA analisar os fundamentos dos ativos e sugerir os melhores encaixes para a sua meta de 1 ação/mês.</p>
                </div>
                <button 
                    className="btn btn-success fw-bold px-4 py-2 rounded-pill flex-shrink-0"
                    onClick={onOpenAI}
                >
                    <i className="bi bi-robot me-2"></i> Consultar Inteligência
                </button>
            </div>
        </div>
    );
}