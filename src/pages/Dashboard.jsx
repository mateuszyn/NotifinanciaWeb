import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAssets } from '../hooks/useAssets';
import { useRecommendedAssets } from '../hooks/useRecommendedAssets';
import { TICKER_DATA } from '../utils/ticker-data.js';
import AssetCard from '../components/AssetCard';
import PortfolioSummary from '../components/PortfolioSummary';
import PortfolioTabs from '../components/PortfolioTabs';
import RecommendedView from '../components/RecommendedView';
import PromptView from '../components/PromptView';
import Header from '../components/Header';
import UpdateAssetModal from '../components/UpdateAssetModal';
import AddAssetDrawer from '../components/AddAssetDrawer';

export default function Dashboard() {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(() => (
        isAuthenticated ? 'portfolio' : 'recommended'
    ));
    const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
    const [assetColumns, setAssetColumns] = useState(() => (
        window.matchMedia('(max-width: 767px)').matches ? 1 : 3
    ));
    const {
        assets,
        loading,
        error,
        sortBy,
        broker,
        notificationsEnabled,
        onSortChange,
        onBrokerChange,
        onToggleNotif,
        addAsset,
        updateAsset,
        deleteAsset,
        refreshSingleAsset
    } = useAssets();
    const {
        recommendedAssets,
        loading: recommendedLoading,
        error: recommendedError,
        refresh: refreshRecommendations
    } = useRecommendedAssets();

    const [editingAsset, setEditingAsset] = useState(null);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [pendingAssetScroll, setPendingAssetScroll] = useState('');
    const [radarTicker, setRadarTicker] = useState(() => (
        location.state?.ticker
        || window.sessionStorage.getItem('notifinancia:pending-radar-ticker')
        || ''
    ));
    const pendingPromptScroll = React.useRef(false);

    const handlePrintScreenshot = async () => {
        if (typeof window.html2canvas !== 'function') {
            window.Swal.fire({
                icon: 'error',
                title: 'Captura indisponível',
                text: 'Não foi possível carregar a ferramenta de captura de tela.'
            });
            return;
        }

        const dividendDetails = Array.from(document.querySelectorAll('.asset-dividends-details'))
            .map(details => ({ details, open: details.open }));

        try {
            document.querySelectorAll('.dropdown-menu.show, .popover.show, .dropdown-toggle.show')
                .forEach(element => element.classList.remove('show'));
            document.querySelectorAll('details.user-menu[open]')
                .forEach(menu => { menu.open = false; });

            document.body.classList.add('capturing-screenshot');
            dividendDetails.forEach(({ details }) => { details.open = true; });
            await new Promise(resolve => window.setTimeout(resolve, 200));

            const captureTarget = document.querySelector('.container.mt-4.mb-5.pb-5');
            if (!captureTarget) {
                throw new Error('Não foi possível localizar a carteira para capturar.');
            }

            const canvas = await window.html2canvas(captureTarget, {
                backgroundColor: '#212529',
                scale: Math.min(window.devicePixelRatio || 1, 2),
                useCORS: true
            });
            const downloadLink = document.createElement('a');
            downloadLink.download = `notifinancia-carteira-${new Date().toISOString().slice(0, 10)}.png`;
            downloadLink.href = canvas.toDataURL('image/png');
            document.body.appendChild(downloadLink);
            downloadLink.click();
            downloadLink.remove();
        } catch (error) {
            window.Swal.fire({
                icon: 'error',
                title: 'Falha ao capturar a carteira',
                text: error.message || 'Tente novamente em alguns instantes.'
            });
        } finally {
            dividendDetails.forEach(({ details, open }) => { details.open = open; });
            document.body.classList.remove('capturing-screenshot');
        }
    };

    React.useEffect(() => {
        if (isAuthenticated && radarTicker) {
            setActiveTab('portfolio');
            window.sessionStorage.removeItem('notifinancia:pending-radar-ticker');
        }
    }, [isAuthenticated, radarTicker]);

    React.useEffect(() => {
        if (!pendingAssetScroll || activeTab !== 'portfolio' || loading) return undefined;

        const frame = window.requestAnimationFrame(() => {
            const target = document.getElementById(`asset-card-${pendingAssetScroll}`);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                target.classList.add('highlight-target');
                window.setTimeout(() => target.classList.remove('highlight-target'), 1200);
            }
            setPendingAssetScroll('');
        });

        return () => window.cancelAnimationFrame(frame);
    }, [activeTab, assets, loading, pendingAssetScroll]);

    React.useEffect(() => {
        if (!radarTicker || !location.state?.ticker) return;

        navigate(`${location.pathname}${location.search}${location.hash}`, {
            replace: true,
            state: null
        });
    }, [location.hash, location.pathname, location.search, location.state, navigate, radarTicker]);

    React.useEffect(() => {
        if (location.hash === '#portfolio-prompt') {
            document.getElementById('portfolio-prompt')?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [location.hash]);

    React.useEffect(() => {
        const promptLoading = activeTab === 'portfolio' ? loading : recommendedLoading;
        if (promptLoading || !pendingPromptScroll.current) return;

        const promptId = activeTab === 'portfolio' ? 'portfolio-prompt' : 'recommended-prompt';
        document.getElementById(promptId)?.scrollIntoView({ behavior: 'smooth' });
        pendingPromptScroll.current = false;
    }, [activeTab, loading, recommendedLoading]);

    const handlePromptClick = () => {
        pendingPromptScroll.current = true;
        const promptLoading = activeTab === 'portfolio' ? loading : recommendedLoading;
        if (!promptLoading) {
            const promptId = activeTab === 'portfolio' ? 'portfolio-prompt' : 'recommended-prompt';
            document.getElementById(promptId)?.scrollIntoView({ behavior: 'smooth' });
            pendingPromptScroll.current = false;
        }
    };

    const portfolioControls = (
        <div className="portfolio-view-controls mb-3" role="group" aria-label="Controles da carteira">
            <div className="portfolio-view-actions">
                <button
                    type="button"
                    className="btn btn-outline-info"
                    onClick={handlePromptClick}
                >
                    <i className="bi bi-stars me-2" aria-hidden="true"></i>
                    IA
                    <i className="bi bi-chevron-down ms-2" aria-hidden="true"></i>
                </button>
                <button type="button" className="btn btn-outline-light" onClick={handlePrintScreenshot}>
                    <i className="bi bi-camera-fill text-info me-2" aria-hidden="true"></i>
                    Print
                </button>
            </div>
            <label className="asset-zoom-control" htmlFor="asset-columns">
                <span className="asset-zoom-label">
                    <i className="bi bi-zoom-out me-2" aria-hidden="true"></i>
                    Densidade dos cards
                </span>
                <span className="asset-zoom-slider">
                    <span aria-hidden="true">−</span>
                    <input
                        id="asset-columns"
                        type="range"
                        min="1"
                        max={isMobile ? 2 : 3}
                        step="1"
                        value={assetColumns}
                        onChange={event => setAssetColumns(Number(event.target.value))}
                        aria-valuetext={`${assetColumns} ${assetColumns === 1 ? 'card' : 'cards'} por linha`}
                    />
                    <span aria-hidden="true">+</span>
                </span>
                <span className="visually-hidden" aria-live="polite">
                    {assetColumns} {assetColumns === 1 ? 'card' : 'cards'} por linha
                </span>
            </label>
        </div>
    );

    React.useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 767px)');
        const handleViewportChange = event => {
            setIsMobile(event.matches);
            setAssetColumns(current => Math.min(current, event.matches ? 2 : 3));
        };
        mediaQuery.addEventListener('change', handleViewportChange);
        return () => mediaQuery.removeEventListener('change', handleViewportChange);
    }, []);

    const handleSaveEdit = async (id, data) => {
        try {
            await updateAsset(id, data);
            setEditingAsset(null);
            window.Swal.fire({ icon: 'success', title: 'Sucesso!', text: 'Ativo atualizado.', timer: 2000, showConfirmButton: false });
        } catch (err) {
            window.Swal.fire({ icon: 'error', title: 'Erro', text: err.message });
        }
    };

    const handleDelete = (asset) => {
        const cleanTicker = asset.ticker.replace(/\.SA$/i, '').toUpperCase();
        const isFII = TICKER_DATA[cleanTicker]?.type === 'FII';
        const lucro = (asset.currentPrice - asset.averagePrice) * asset.quantity;
        const temLucro = lucro > 0;
        const temPrejuizo = lucro < 0;

        const getLastBusinessDay = () => {
            const today = new Date();
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);
            let dayOfWeek = nextMonth.getDay();
            if (dayOfWeek === 0) nextMonth.setDate(nextMonth.getDate() - 2);
            else if (dayOfWeek === 6) nextMonth.setDate(nextMonth.getDate() - 1);
            return `${String(nextMonth.getDate()).padStart(2, '0')}/${String(nextMonth.getMonth() + 1).padStart(2, '0')}/${nextMonth.getFullYear()}`;
        };

        let alertConfig;

        if (isFII && temLucro) {
            const imposto = lucro * 0.20;
            alertConfig = {
                title: 'Atenção: Imposto Devido',
                icon: 'warning',
                html: `
                    <div class="mb-3">
                        Lucro apurado: <b>R$ ${lucro.toFixed(2).replace('.', ',')}</b><br>
                        Imposto a pagar (20%): <b><span class="text-danger">R$ ${imposto.toFixed(2).replace('.', ',')}</span></b>
                    </div>
                    <div class="text-start">
                        <p class="small text-secondary mb-2"><b>1.</b> Efetue a venda na sua corretora.</p>
                        <p class="small text-secondary mb-1"><b>2.</b> Acesse o SicalcWeb e gere o DARF (cód. 6015) até <b>${getLastBusinessDay()}</b>.</p>
                    </div>
                `,
                showCloseButton: true, allowOutsideClick: false, showCancelButton: true,
                confirmButtonColor: '#dc3545', confirmButtonText: 'Sim, remover da carteira', cancelButtonText: 'Cancelar'
            };
        } else if (isFII && temPrejuizo) {
            alertConfig = {
                title: 'Venda com Prejuízo (Sem Imposto)',
                icon: 'info',
                html: `
                    <div class="mb-3">Prejuízo apurado: <b class="text-danger">R$ ${Math.abs(lucro).toFixed(2).replace('.', ',')}</b></div>
                    <div class="text-start">
                        <p class="small text-secondary mb-2">Como a operação gerou prejuízo, não há DARF a pagar sobre essa venda.</p>
                        <p class="small text-secondary mb-1">Recomendamos anotar este prejuízo para abater de futuros lucros com FIIs na sua declaração anual.</p>
                    </div>
                `,
                showCloseButton: true, allowOutsideClick: false, showCancelButton: true,
                confirmButtonColor: '#dc3545', confirmButtonText: 'Entendi, remover ativo', cancelButtonText: 'Cancelar'
            };
        } else {
            alertConfig = {
                title: 'Excluir Ativo?', text: "Você não poderá reverter isso!", icon: 'warning',
                showCancelButton: true, confirmButtonColor: '#dc3545', cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sim, excluir!', cancelButtonText: 'Cancelar'
            };
        }

        window.Swal.fire(alertConfig).then(async (result) => {
            if (result.isConfirmed) {
                window.Swal.fire({ title: 'Excluindo ativo...', allowOutsideClick: false, didOpen: () => window.Swal.showLoading() });
                try {
                    await deleteAsset(asset.id);
                    window.Swal.fire({ title: 'Ativo Removido!', icon: 'success', showConfirmButton: false, timer: 1500 });
                } catch (err) {
                    window.Swal.fire({ icon: 'error', title: 'Erro', text: err.message });
                }
            }
        });
    };

    return (
        <>
            <Header
                sortBy={sortBy}
                onSortChange={onSortChange}
                broker={broker}
                onBrokerChange={onBrokerChange}
                notificationsEnabled={notificationsEnabled}
                onToggleNotif={onToggleNotif}
            />

            <div className="container mt-4 mb-5 pb-5">

                <PortfolioTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    portfolioCount={assets.length}
                    recommendedCount={10}
                />

                {activeTab === 'portfolio' && !isAuthenticated && (
                    <div className="alert alert-info d-flex align-items-center gap-2" role="status">
                        <i className="bi bi-info-circle-fill" aria-hidden="true"></i>
                        <span><strong>Carteira Provisória Local:</strong> seus ativos e ajustes ficam salvos neste dispositivo.</span>
                    </div>
                )}

                {activeTab === 'portfolio' && !loading && (
                    <PortfolioSummary assets={assets} isAuthenticated={isAuthenticated} />
                )}

                {activeTab === 'recommended' && (
                    <>
                        <RecommendedView
                            onAddAsset={addAsset}
                            assetColumns={assetColumns}
                            recommendedAssets={recommendedAssets}
                            loading={recommendedLoading}
                            error={recommendedError}
                            refresh={refreshRecommendations}
                            toolbar={portfolioControls}
                            existingTickers={assets.map(asset => asset.ticker)}
                            onGoToPortfolio={ticker => {
                                setPendingAssetScroll(ticker);
                                setActiveTab('portfolio');
                            }}
                        />
                        <PromptView mode="recommended" assets={recommendedAssets} isGuest={false} />
                    </>
                )}

                {activeTab === 'portfolio' && (
                    <>
                {portfolioControls}
                {loading && (
                    <div className="row">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="col-12 col-md-6 col-lg-4 mb-4">
                                <div className="skeleton-card">
                                    <div className="skeleton-header">
                                        <div className="skeleton-line skeleton-title"></div>
                                        <div className="skeleton-circle"></div>
                                    </div>
                                    <div className="skeleton-block"></div>
                                    <div className="skeleton-row">
                                        <div className="skeleton-block"></div>
                                        <div className="skeleton-block"></div>
                                    </div>
                                    <div className="skeleton-block skeleton-block-lg mt-3"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {error && <p className="text-danger">{error}</p>}

                {!loading && assets.length === 0 && (
                    <div className="text-center py-5 border border-secondary rounded-4 bg-dark my-4 p-4">
                        <i className="bi bi-wallet2 text-success" style={{ fontSize: '3rem' }}></i>
                        <h3 className="h5 text-white fw-bold mt-3">Sua carteira está vazia</h3>
                        <p className="text-secondary small mb-4" style={{ maxWidth: '420px', margin: '0 auto' }}>
                            Adicione seus ativos para calcular o preço médio, projetar dividendos e acompanhar a Bola de Neve.
                        </p>
                        <button className="btn btn-success fw-bold px-4 py-2" onClick={() => setIsSearchModalOpen(true)}>
                            <i className="bi bi-search me-2"></i> Buscar Novo Ativo
                        </button>
                    </div>
                )}

                {!loading && assets.length > 0 && (
                    <div
                        className="asset-cards-grid mt-3"
                        style={{ '--asset-columns': assetColumns }}
                    >
                        {assets.map(asset => (
                            <AssetCard
                                key={asset.id || asset.ticker}
                                asset={asset}
                                broker={broker}
                                isGuest={!isAuthenticated}
                                onEdit={setEditingAsset}
                                onDelete={handleDelete}
                                onRetry={() => refreshSingleAsset(asset.ticker)}
                            />
                        ))}
                    </div>
                )}

                {!loading && <PromptView mode="portfolio" assets={assets} isGuest={false} />}
                    </>
                )}
            </div>

            <UpdateAssetModal 
                asset={editingAsset} 
                onClose={() => setEditingAsset(null)} 
                onSave={handleSaveEdit} 
            />
            
            <AddAssetDrawer
                onAddAsset={addAsset}
                existingTickers={assets.map(a => a.ticker)}
                initialTicker={radarTicker}
                openRequested={isSearchModalOpen}
                onOpenRequestHandled={() => setIsSearchModalOpen(false)}
            />
        </>
    );
}
