import React, { useState, useEffect } from 'react';
import { TICKER_DATA } from '../utils/ticker-data.js';
import { createFiiLossAlert, createFiiProfitTaxAlert } from '../utils/fii-tax-alert.js';

export default function UpdateAssetModal({ asset, onClose, onSave, onDelete }) {
    const [quantity, setQuantity] = useState(0);
    const [averagePrice, setAveragePrice] = useState(0);

    // Initialize state when asset changes
    useEffect(() => {
        if (asset) {
            setQuantity(Number(asset.quantity) || 0);
            setAveragePrice(Number(asset.averagePrice) || 0);
        }
    }, [asset]);

    if (!asset) return null;

    const handleQuickQty = (delta) => {
        setQuantity(prev => Math.max(0, Math.round(prev + delta)));
    };

    const handleQuickPrice = (delta) => {
        setAveragePrice(prev => Math.max(0, Number((prev + delta).toFixed(2))));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const newQuantity = Number(quantity);
        const currentQuantity = Number(asset.quantity) || 0;
        const cleanTicker = String(asset.ticker || '').replace(/\.SA$/i, '').toUpperCase();
        const isFii = asset.type === 'FII' || TICKER_DATA[cleanTicker]?.type === 'FII';
        const soldQuantity = currentQuantity - newQuantity;
        const averagePriceAtSale = Number(averagePrice) || 0;
        const currentPrice = Number(asset.currentPrice) || 0;
        const profit = (currentPrice - averagePriceAtSale) * soldQuantity;
        const assetName = asset.name || TICKER_DATA[cleanTicker]?.name || asset.ticker;

        const confirmFiiSale = async (confirmButtonText, cancelButtonText) => {
            if (profit > 0) {
                return window.Swal.fire(createFiiProfitTaxAlert({
                    assetName,
                    soldQuantity,
                    profit,
                    confirmButtonText,
                    cancelButtonText,
                    allowOutsideClick: false
                }));
            }
            if (profit < 0) {
                return window.Swal.fire(createFiiLossAlert({
                    assetName,
                    soldQuantity,
                    loss: profit,
                    confirmButtonText,
                    cancelButtonText,
                    allowOutsideClick: false
                }));
            }
            return window.Swal.fire({
                title: 'Confirmar encerramento?',
                text: `Você está encerrando sua posição em ${assetName}.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText,
                cancelButtonText,
                confirmButtonColor: '#198754',
                cancelButtonColor: '#6c757d',
                background: '#212529',
                color: '#ffffff'
            });
        };

        if (newQuantity === 0) {
            const result = isFii
                ? await confirmFiiSale('Entendi, excluir posição', 'Cancelar')
                : await window.Swal.fire({
                    title: 'Encerrar posição?',
                    text: `O ativo ${assetName} será removido da carteira.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sim, encerrar posição',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#dc3545',
                    cancelButtonColor: '#6c757d'
                });
            if (!result.isConfirmed) return;

            try {
                await onDelete(asset.id);
                onClose();
                await window.Swal.fire({
                    icon: 'success',
                    title: 'Posição encerrada',
                    text: `${asset.ticker} foi removido da carteira.`,
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (error) {
                console.error('Não foi possível encerrar a posição.', error);
                await window.Swal.fire({
                    icon: 'error',
                    title: 'Erro ao encerrar posição',
                    text: error.message || 'Não foi possível remover o ativo da carteira.'
                });
            }
            return;
        }

        if (isFii && soldQuantity > 0 && profit !== 0) {
            const result = await confirmFiiSale('Entendi, salvar redução', 'Revisar edição');
            if (!result.isConfirmed) return;
        }

        await onSave(asset.id, { quantity: newQuantity, averagePrice: Number(averagePrice) });
    };

    return (
        <div className="modal-overlay active" id="update-modal-overlay" onClick={(e) => e.target.id === 'update-modal-overlay' && onClose()}>
            <div className="custom-modal">
                <h3 className="modal-title text-white fs-5 mb-4 border-bottom border-secondary pb-2">
                    Editar <span className="text-success fw-bold">{asset.ticker}</span>
                </h3>
                <form id="form-update-asset" onSubmit={handleSubmit}>
                    <div className="form-group mb-3">
                        <label className="small text-secondary fw-bold mb-1">Quantidade</label>
                        <input
                            type="number"
                            className="form-control bg-black text-white border-secondary"
                            required
                            min="0"
                            step="any"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                        />
                        <div className="d-flex gap-2 mt-2">
                            <button type="button" className="btn btn-outline-danger btn-sm btn-quick-qty" onClick={() => handleQuickQty(-100)}>-100</button>
                            <button type="button" className="btn btn-outline-danger btn-sm btn-quick-qty" onClick={() => handleQuickQty(-10)}>-10</button>
                            <button type="button" className="btn btn-outline-danger btn-sm btn-quick-qty" onClick={() => handleQuickQty(-1)}>-1</button>
                            <button type="button" className="btn btn-outline-success btn-sm btn-quick-qty" onClick={() => handleQuickQty(1)}>+1</button>
                            <button type="button" className="btn btn-outline-success btn-sm btn-quick-qty" onClick={() => handleQuickQty(10)}>+10</button>
                            <button type="button" className="btn btn-outline-success btn-sm btn-quick-qty" onClick={() => handleQuickQty(100)}>+100</button>
                        </div>
                    </div>
                    <div className="form-group mb-4">
                        <label className="small text-secondary fw-bold mb-1">Preço Médio (R$)</label>
                        <input
                            type="number"
                            className="form-control bg-black text-white border-secondary"
                            required
                            step="0.01"
                            value={averagePrice}
                            onChange={(e) => {
                                const parsedPrice = parseFloat(e.target.value);
                                setAveragePrice(Number.isFinite(parsedPrice) ? Number(parsedPrice.toFixed(2)) : 0);
                            }}
                        />
                        <div className="d-flex gap-2 mt-2">
                            <button type="button" className="btn btn-outline-danger btn-sm btn-quick-price" onClick={() => handleQuickPrice(-0.1)}>-0,10</button>
                            <button type="button" className="btn btn-outline-danger btn-sm btn-quick-price" onClick={() => handleQuickPrice(-0.01)}>-0,01</button>
                            <button type="button" className="btn btn-outline-success btn-sm btn-quick-price" onClick={() => handleQuickPrice(0.01)}>+0,01</button>
                            <button type="button" className="btn btn-outline-success btn-sm btn-quick-price" onClick={() => handleQuickPrice(0.1)}>+0,10</button>
                        </div>
                    </div>
                    <div className="d-flex gap-3 mt-4">
                        <button type="button" className="btn btn-outline-secondary flex-grow-1 fw-bold py-2" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn btn-success flex-grow-1 fw-bold py-2">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
