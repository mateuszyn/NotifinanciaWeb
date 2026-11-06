import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AssetService } from '../services/asset-service.js';
import { supabase } from '../infrastructure/supabase-client.js';

const GUEST_ASSETS_KEY = 'notifinancia_guest_assets';
const GUEST_SORT_KEY = 'notifinancia_guest_sort';
const GUEST_BROKER_KEY = 'notifinancia_guest_broker';

function readGuestPreference(key, fallback) {
    try {
        return window.localStorage.getItem(key) || fallback;
    } catch (error) {
        console.error(`Não foi possível carregar a preferência local "${key}".`, error);
        return fallback;
    }
}

function readGuestAssets() {
    try {
        const storedAssets = window.localStorage.getItem(GUEST_ASSETS_KEY);
        if (!storedAssets) return [];

        const parsedAssets = JSON.parse(storedAssets);
        return Array.isArray(parsedAssets)
            ? parsedAssets.filter(asset => asset && typeof asset.ticker === 'string')
            : [];
    } catch (error) {
        console.error('Não foi possível carregar a carteira local do visitante.', error);
        return [];
    }
}

function saveGuestAssets(assets) {
    window.localStorage.setItem(GUEST_ASSETS_KEY, JSON.stringify(assets));
}

// Ordenação: a mesma lógica que existia no AssetController
function sortAssets(assets, criteria) {
    const sorted = [...assets];
    switch (criteria) {
        case 'name_asc': return sorted.sort((a, b) => a.ticker.localeCompare(b.ticker));
        case 'name_desc': return sorted.sort((a, b) => b.ticker.localeCompare(a.ticker));
        case 'day_desc': return sorted.sort((a, b) => (b.dailyChange || 0) - (a.dailyChange || 0));
        case 'day_asc': return sorted.sort((a, b) => (a.dailyChange || 0) - (b.dailyChange || 0));
        case 'pm_asc': return sorted.sort((a, b) => (a.variacaoPm || 0) - (b.variacaoPm || 0));
        case 'pm_desc': return sorted.sort((a, b) => (b.variacaoPm || 0) - (a.variacaoPm || 0));
        case 'total_desc': return sorted.sort((a, b) => ((b.currentPrice * b.quantity) || 0) - ((a.currentPrice * a.quantity) || 0));
        case 'total_asc': return sorted.sort((a, b) => ((a.currentPrice * a.quantity) || 0) - ((b.currentPrice * b.quantity) || 0));
        default: return sorted;
    }
}

export function useAssets() {
    const { user, isAuthenticated } = useAuth();
    const [rawAssets, setRawAssets] = useState(() => (
        isAuthenticated ? [] : readGuestAssets()
    ));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Preferências do usuário vindas do perfil (Supabase)
    const [sortBy, setSortBy] = useState('pm_asc');
    const [broker, setBroker] = useState('Nubank');
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                if (!isAuthenticated) {
                    setRawAssets(readGuestAssets());
                    setSortBy(readGuestPreference(GUEST_SORT_KEY, 'pm_asc'));
                    setBroker(readGuestPreference(GUEST_BROKER_KEY, 'Nubank'));
                } else {
                    // Busca perfil do usuário
                    const { data: prof } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .maybeSingle();

                    if (prof) {
                        setSortBy(prof.sort_by || 'pm_asc');
                        setBroker(prof.preferred_broker || 'Nubank');
                        setNotificationsEnabled(prof.notifications_enabled || false);
                    }

                    // REAL MODE: Fetch do banco
                    const userAssets = await AssetService.getAssets();
                    setRawAssets(userAssets || []);

                    // SWR: Revalida preços no background
                    if (userAssets && userAssets.length > 0) {
                        const allTickers = userAssets.map(a => `${a.ticker.replace(/\.SA$/i, '')}.SA`);
                        AssetService.getMarketPrices(allTickers).then(data => {
                            const apiResults = data.results || [];
                            setRawAssets(prev => {
                                const updated = [...prev];
                                updated.forEach(asset => {
                                    const norm = asset.ticker.replace(/\.SA$/i, '').toUpperCase();
                                    let marketData = Array.isArray(apiResults)
                                        ? apiResults.find(i => i.symbol === norm || i.symbol === `${norm}.SA`) || {}
                                        : apiResults[norm] || apiResults[`${norm}.SA`] || {};
                                    asset.enrich(marketData);
                                });
                                AssetService.saveCacheBackground(updated);
                                return [...updated];
                            });
                        }).catch(e => console.error("SWR falhou silenciosamente", e));
                    }
                }
            } catch (err) {
                console.error(err);
                setError("Erro ao carregar os ativos.");
            } finally {
                setLoading(false);
            }
        }

        if (user !== undefined) {
            loadData();
        }
    }, [isAuthenticated, user]);

    // Muda ordenação e salva no perfil
    const handleSortChange = async (newSort) => {
        setSortBy(newSort);
        if (!isAuthenticated) {
            window.localStorage.setItem(GUEST_SORT_KEY, newSort);
        } else if (user) {
            await supabase.from('profiles').update({ sort_by: newSort }).eq('id', user.id);
        }
    };

    // Muda corretora e salva no perfil
    const handleBrokerChange = async (newBroker) => {
        setBroker(newBroker);
        if (!isAuthenticated) {
            window.localStorage.setItem(GUEST_BROKER_KEY, newBroker);
        } else if (user) {
            await supabase.from('profiles').update({ preferred_broker: newBroker }).eq('id', user.id);
        }
    };

    // Toggle de notificações com salva no perfil
    const handleToggleNotif = async () => {
        const novoEstado = !notificationsEnabled;
        setNotificationsEnabled(novoEstado);
        if (isAuthenticated && user) {
            await supabase.from('profiles').upsert({
                id: user.id,
                email: user.email,
                notifications_enabled: novoEstado,
                updated_at: new Date()
            });
        }
    };

    // --- FUNÇÕES DE CRUD ---

    const addAsset = async (assetData) => {
        if (!isAuthenticated) {
            const ticker = String(assetData.ticker).trim().toUpperCase();
            if (rawAssets.some(asset => asset.ticker.toUpperCase() === ticker)) {
                throw new Error(`O ativo ${ticker} já está na carteira.`);
            }

            const quantity = Number(assetData.quantity);
            const averagePrice = Number(assetData.averagePrice);
            if (!ticker || !Number.isFinite(quantity) || quantity <= 0
                || !Number.isFinite(averagePrice) || averagePrice <= 0) {
                throw new Error('Informe um ticker, uma quantidade e um preço médio válidos.');
            }

            const currentPrice = Number(assetData.currentPrice) > 0
                ? Number(assetData.currentPrice)
                : averagePrice;
            const yieldPct = Number(assetData.yieldPct) || 0;
            const guestAsset = {
                id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                ticker,
                quantity,
                averagePrice,
                currentPrice,
                dailyChange: Number(assetData.dailyChange) || 0,
                yieldPct,
                pvp: Number(assetData.pvp) || null,
                type: assetData.type,
                divMensal: currentPrice * (yieldPct / 100) * quantity / 12,
                divAnual: currentPrice * (yieldPct / 100) * quantity,
                variacaoPm: averagePrice > 0
                    ? ((currentPrice / averagePrice) - 1) * 100
                    : 0,
                totalValue: quantity * currentPrice,
                paidMonths: Array.isArray(assetData.paidMonths) ? assetData.paidMonths : [],
                dataError: false
            };
            const updatedAssets = [...rawAssets, guestAsset];
            saveGuestAssets(updatedAssets);
            setRawAssets(updatedAssets);
            return { tickerDiscoveryFailed: false };
        }

        await AssetService.addAsset(assetData);
        let tickerDiscoveryFailed = false;
        try {
            await AssetService.addDiscoveredTicker(assetData.ticker);
        } catch (err) {
            console.error('Ativo salvo, mas não foi possível registrar o ticker descoberto.', err);
            tickerDiscoveryFailed = true;
        }
        // Após adicionar no banco, refazemos o fetch completo
        const updatedAssets = await AssetService.getAssets();
        setRawAssets(updatedAssets || []);
        // E engatilhamos o SWR local para esse ativo para não ficar com preço zerado na tela
        refreshSingleAsset(assetData.ticker);
        return { tickerDiscoveryFailed };
    };

    const updateAsset = async (id, data) => {
        if (!isAuthenticated) {
            const updatedAssets = rawAssets.map(asset => {
                if (asset.id !== id) return asset;

                const quantity = Number(data.quantity) || 0;
                const averagePrice = Number(data.averagePrice) || 0;
                return {
                    ...asset,
                    quantity,
                    averagePrice,
                    variacaoPm: averagePrice > 0
                        ? ((asset.currentPrice / averagePrice) - 1) * 100
                        : 0,
                    totalValue: asset.currentPrice * quantity,
                    divAnual: asset.currentPrice * (asset.yieldPct / 100) * quantity,
                    divMensal: asset.currentPrice * (asset.yieldPct / 100) * quantity / 12
                };
            });
            saveGuestAssets(updatedAssets);
            setRawAssets(updatedAssets);
            return;
        }

        await AssetService.updateAsset(id, data);
        // Atualização otimista no estado local
        setRawAssets(prev => prev.map(a => {
            if (a.id == id) {
                a.quantity = data.quantity;
                a.averagePrice = data.averagePrice;
                if (data.vpa !== undefined) a.vpa = data.vpa ? Number(data.vpa) : null;
                a.variacaoPm = a.averagePrice > 0 ? ((a.currentPrice - a.averagePrice) / a.averagePrice) * 100 : 0;
                a.totalValue = a.currentPrice * a.quantity;
                a.divAnual = a.currentPrice * (a.yieldPct / 100) * a.quantity;
                a.divMensal = a.divAnual / 12;
            }
            return a;
        }));
    };

    const deleteAsset = async (id) => {
        if (!isAuthenticated) {
            const updatedAssets = rawAssets.filter(asset => asset.id !== id);
            saveGuestAssets(updatedAssets);
            setRawAssets(updatedAssets);
            return;
        }

        await AssetService.deleteAsset(id);
        // Remove localmente
        setRawAssets(prev => prev.filter(a => a.id != id));
    };

    const refreshSingleAsset = async (ticker) => {
        if (!isAuthenticated) return;
        try {
            const data = await AssetService.getMarketPrices([ticker]);
            const apiResults = data.results || [];
            let marketData = Array.isArray(apiResults)
                ? apiResults.find(i => i.symbol.toUpperCase() === ticker.toUpperCase() || i.symbol.toUpperCase() === `${ticker.toUpperCase()}.SA`) || {}
                : apiResults[ticker.toUpperCase()] || apiResults[`${ticker.toUpperCase()}.SA`] || {};
                
            setRawAssets(prev => {
                const updated = [...prev];
                const index = updated.findIndex(a => a.ticker.toUpperCase() === ticker.toUpperCase());
                if (index !== -1) {
                    updated[index].enrich(marketData);
                    updated[index].dataError = false; // reseta erro se houver
                    AssetService.saveCacheBackground([updated[index]]);
                }
                return updated;
            });
        } catch (error) {
            setRawAssets(prev => {
                const updated = [...prev];
                const index = updated.findIndex(a => a.ticker.toUpperCase() === ticker.toUpperCase());
                if (index !== -1) updated[index].dataError = true;
                return updated;
            });
        }
    };

    // Ativos já ordenados para renderização
    const assets = sortAssets(rawAssets, sortBy);

    return {
        assets,
        loading,
        error,
        setRawAssets,
        sortBy,
        broker,
        notificationsEnabled,
        onSortChange: handleSortChange,
        onBrokerChange: handleBrokerChange,
        onToggleNotif: handleToggleNotif,
        addAsset,
        updateAsset,
        deleteAsset,
        refreshSingleAsset
    };
}
