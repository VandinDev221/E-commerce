import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Simulação de cálculo por CEP (em produção usar API ViaCEP + tabela de transportadoras)
router.post('/calculate', async (req, res, next) => {
  try {
    const { zipCode } = z.object({ zipCode: z.string().min(8).max(9) }).parse(req.body);
    const cleanZip = zipCode.replace(/\D/g, '');
    // ViaCEP para validar e obter região
    const viaCep = (await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`).then((r) =>
      r.json()
    )) as { erro?: boolean };
    if (viaCep.erro) {
      return res.status(400).json({ error: 'CEP não encontrado' });
    }
    // Valores fictícios por região (exemplo)
    const shippingOptions = [
      { name: 'Entrega padrão', price: 15.9, days: '5-8 dias úteis' },
      { name: 'Entrega expressa', price: 29.9, days: '2-3 dias úteis' },
    ];
    res.json({ zipCode: cleanZip, address: viaCep, options: shippingOptions });
  } catch (e) {
    next(e);
  }
});

router.get('/cep/:zip', async (req, res, next) => {
  try {
    const zip = req.params.zip.replace(/\D/g, '');
    const data = (await fetch(`https://viacep.com.br/ws/${zip}/json/`).then((r) =>
      r.json()
    )) as { erro?: boolean };
    if (data.erro) return res.status(404).json({ error: 'CEP não encontrado' });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

export const shippingRoutes = router;
