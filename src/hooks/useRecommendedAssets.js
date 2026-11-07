import { useCallback, useEffect, useRef, useState } from 'react';
import { AssetService } from '../services/asset-service.js';
import { ELIGIBLE_UNIVERSE } from '../utils/eligible-universe.js';
import { rankRecommendedAssets } from '../utils/opportunity-screener.js';

const CACHE_KEY = 'notifinancia:recommended-assets:v1';
const CACHE_MAX_AGE_MS = 2 * 60 * 60 * 1000;

function isValidCache(cache, now) {
    if (!cache || !Array.isArray(cache.recommendedAssets) || cache.recommendedAssets.length !== 10) {
        return false;
    }

    const timestamp = Date.parse(cache.timestamp);
    if (!Number.isFinite(timestamp) || timestamp > now.getTime()) return false;

    const age = now.getTime() - timestamp;
    const weekday = now.getDay() >= 1 && now.getDay() <= 5;
    if (weekday && age < CACHE_MAX_AGE_MS) return true;

    const createdAt = new Date(timestamp);
    return createdAt.toDateString() === now.toDateString() && createdAt.getHours() >= 18;
}

function readCache() {
    if (typeof window === 'undefined') return { cache: null, error: null };

    try {
        const storedValue = window.localStorage.getItem(CACHE_KEY);
        if (!storedValue) return { cache: null, error: null };

        const parsed = JSON.parse(storedValue);
        return {
            cache: isValidCache(parsed, new Date()) ? parsed : null,
            error: null
        };
    } catch (error) {
        return { cache: null, error };
    }
}

export function useRecommendedAssets() {
    const [initialCache] = useState(readCache);
    const [recommendedAssets, setRecommendedAssets] = useState(
        initialCache.cache?.recommendedAssets ?? []
    );
    const [loading, setLoading] = useState(!initialCache.cache);
    const [error, setError] = useState(initialCache.error);
    const requestId = useRef(0);

    const saveLocalCache = useCallback((assets, marketData) => {
        const cache = {
            recommendedAssets: assets,
            marketData,
            timestamp: new Date().toISOString()
        };
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }, []);

    const fetchAndRank = useCallback(async currentRequestId => {
        const query = new URLSearchParams({ tickers: ELIGIBLE_UNIVERSE.join(',') });
        const response = await fetch(`/api/market-data?${query.toString()}`);
        if (!response.ok) {
            throw new Error(`Falha ao buscar oportunidades de mercado (HTTP ${response.status}).`);
        }

        const payload = await response.json();
        if (!payload?.results || typeof payload.results !== 'object') {
            throw new Error('A resposta da API de mercado está em um formato inválido.');
        }

        const rankedAssets = rankRecommendedAssets(payload.results);
        if (currentRequestId !== requestId.current) return;

        setRecommendedAssets(rankedAssets);

        try {
            await AssetService.saveRecommendedCache(rankedAssets);
        } catch (cacheError) {
            console.warn(
                'As recomendações foram carregadas, mas não foi possível salvar o cache público no Supabase. Confira se as colunas de recommended_cache correspondem ao payload.',
                cacheError
            );
        }

        try {
            saveLocalCache(rankedAssets, payload.results);
        } catch (storageError) {
            console.warn('Não foi possível salvar as recomendações no localStorage:', storageError);
        }
    }, [saveLocalCache]);

    const loadFromSupabaseOrFetch = useCallback(async currentRequestId => {
        try {
            const cachedAssets = await AssetService.getRecommendedFromCache();
            if (currentRequestId !== requestId.current) return;

            if (cachedAssets.length === 10) {
                setRecommendedAssets(cachedAssets);
                try {
                    saveLocalCache(cachedAssets);
                } catch (storageError) {
                    console.warn('Não foi possível atualizar o localStorage com o cache Supabase:', storageError);
                }
                return;
            }
        } catch (cacheError) {
            console.warn('Não foi possível ler o cache de recomendações do Supabase:', cacheError);
        }

        await fetchAndRank(currentRequestId);
    }, [fetchAndRank, saveLocalCache]);

    const refresh = useCallback(async () => {
        const currentRequestId = ++requestId.current;
        setLoading(true);
        setError(null);

        try {
            await fetchAndRank(currentRequestId);
        } catch (requestError) {
            if (currentRequestId === requestId.current) setError(requestError);
        } finally {
            if (currentRequestId === requestId.current) setLoading(false);
        }
    }, [fetchAndRank]);

    useEffect(() => {
        if (!initialCache.cache) {
            const currentRequestId = ++requestId.current;
            const load = async () => {
                setLoading(true);
                setError(null);
                try {
                    await loadFromSupabaseOrFetch(currentRequestId);
                } catch (requestError) {
                    if (currentRequestId === requestId.current) setError(requestError);
                } finally {
                    if (currentRequestId === requestId.current) setLoading(false);
                }
            };
            load();
        }

        return () => {
            requestId.current += 1;
        };
    }, [initialCache.cache, loadFromSupabaseOrFetch]);

    return { recommendedAssets, loading, error, refresh };
}