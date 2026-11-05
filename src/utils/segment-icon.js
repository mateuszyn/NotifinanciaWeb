/**
 * Mapeamento e informações padronizadas para cada área/segmento de atuação de ativos da B3,
 * enriquecidos com critérios de segurança, retorno e a metodologia BESST.
 */

export const getSegmentDetails = (rawSegment) => {
    if (!rawSegment) {
        return {
            title: 'Setor Diversificado',
            icon: 'bi-briefcase-fill',
            description: 'Atuação multissetorial ou holding. Interessante para diversificação ampla de portfólio. Oferece segurança moderada pela dispersão de riscos entre vários mercados, com retorno dependente da eficiência da gestão na alocação de capital.'
        };
    }
    const seg = rawSegment.toLowerCase();

    // 1. Agronegócio e Fiagros (prioridade antes de crédito/papel genérico)
    if (seg.includes('fiagro') || seg.includes('agro') || seg.includes('sementes') || seg.includes('fertilizantes') || seg.includes('terras') || seg.includes('açúcar e álcool')) {
        return {
            title: 'Agronegócio & Fiagro',
            icon: 'bi-tree-fill',
            description: 'Cadeia rural, terras e financiamentos. Interessante em momentos de alta de commodities ou busca por isenção de IR (via Fiagros). Segurança moderada-alta (suportada por garantias reais de terras e grãos, mas exposta ao clima e preços internacionais). Retorno focado em dividendos atrativos, porém com comportamento cíclico.'
        };
    }

    // 2. Papel e Celulose (prioridade antes de Papel e Recebíveis)
    if (seg.includes('celulose') || seg.includes('painéis') || seg.includes('madeira e papel')) {
        return {
            title: 'Papel & Celulose',
            icon: 'bi-file-earmark-ruled',
            description: 'Produção florestal e celulose global. Interessante em ciclos de alta do dólar e forte demanda externa. Perfil altamente cíclico com volatilidade nos preços internacionais, exigindo cautela na entrada. Oferece forte geração de caixa e retornos expressivos em moeda forte quando o ciclo é favorável.'
        };
    }

    // 3. Papel, Recebíveis e Dívida Imobiliária (CRIs)
    if (seg.includes('recebíveis') || seg.includes('papel') || seg.includes('cri') || seg.includes('cra') || seg.includes('securities')) {
        return {
            title: 'Papel & Recebíveis',
            icon: 'bi-file-earmark-text-fill',
            description: 'Títulos de crédito e dívida imobiliária/agrícola. Interessante em cenários de juros altos (CDI elevado) para maximizar o fluxo de caixa mensal isento de IR. Segurança baseada em garantias e análise rigorosa de risco (atenção ao risco de crédito), com retornos atrelados a taxas flutuantes ou inflação (IPCA + spread).'
        };
    }

    // 4. Fundos de Fundos (FoF) e Hedge Funds
    if (seg.includes('fof') || seg.includes('fundos de fundos') || seg.includes('hedge fund')) {
        return {
            title: 'Fundos de Fundos (FoF)',
            icon: 'bi-collection-fill',
            description: 'Gestão ativa focada em cotas de outros fundos. Interessante para investidores que buscam diversificação imediata e gestão profissional especializada. Segurança alta pela pulverização de ativos, embora incorpore dupla taxa de administração. Retorno focado em dividendos regulares e oportunidades de ganho de capital por desconto patrimonial.'
        };
    }

    // 5. Financeiro, Bancos e Meios de Pagamento (BESST - B)
    if (seg.includes('banco') || seg.includes('financeiro') || seg.includes('pagamento') || seg.includes('crédito') || seg.includes('infraestrutura / papel') || seg.includes('financeiras')) {
        return {
            title: 'Setor Financeiro & Bancos',
            icon: 'bi-bank',
            description: 'Pilares da metodologia BESST (Bancos). Interessante para o longo prazo devido à solidez de grandes instituições, alta previsibilidade de lucros e ROE elevado. Oferece alta segurança regulatória, barreiras de entrada expressivas e excelente retorno em dividendos e JCP recorrentes.'
        };
    }

    // 6. Energia Elétrica e Gás (BESST - E)
    if (seg.includes('energia') || seg.includes('elétrica') || seg.includes('transmissão') || seg.includes('renováveis') || seg.includes('gás e saneamento')) {
        return {
            title: 'Energia Elétrica & Utilidades',
            icon: 'bi-lightning-charge-fill',
            description: 'Pilares da metodologia BESST (Energia). Setor perene com contratos de longo prazo reajustados pela inflação. Ideal para construir renda passiva previsível. Altíssima segurança e resiliência em crises devido à demanda inelástica, com retornos consistentes via dividendos perenes.'
        };
    }

    // 7. Saneamento e Tratamento de Água (BESST - S)
    if (seg.includes('saneamento') || seg.includes('água')) {
        return {
            title: 'Saneamento & Água',
            icon: 'bi-droplet-fill',
            description: 'Pilares da metodologia BESST (Saneamento). Monopólio natural essencial com demanda perene e contratos de concessão longos. Máxima segurança defensiva contra turbulências macroeconômicas. Retorno previsível e estável, ideal para estratégias de buy-and-hold focadas em dividendos.'
        };
    }

    // 8. Logística e Transportes
    if (seg.includes('logística') || seg.includes('transporte') || seg.includes('ferroviár') || seg.includes('rodovi') || seg.includes('portu') || seg.includes('navegação') || seg.includes('aéreo') || seg.includes('aluguel de carros') || seg.includes('frota')) {
        return {
            title: 'Logística & Transportes',
            icon: 'bi-truck',
            description: 'Galpões logísticos, rodovias e ferrovias. Interessante com a expansão de e-commerce e cadeias de suprimentos. Segurança baseada em contratos de locação de longo prazo (atípicos) com inquilinos AAA. Retorno sólido equilibrando yield de aluguel atrativo e valorização patrimonial.'
        };
    }

    // 9. Imobiliário / Tijolo (Shoppings, Lajes, Galpões, Renda Urbana, Hotéis)
    if (seg.includes('shopping') || seg.includes('lajes') || seg.includes('imóveis') || seg.includes('imobiliário') || seg.includes('tijolo') || seg.includes('galpões') || seg.includes('renda urbana') || seg.includes('hotel') || seg.includes('hotéis') || seg.includes('residencial') || seg.includes('desenvolvimento imobiliário')) {
        return {
            title: 'Imóveis & Tijolo',
            icon: 'bi-building',
            description: 'Ativos físicos (galpões, lajes, shoppings). Excelente proteção contra a inflação (contratos atrelados ao IPCA/IGP-M) e geração de renda de aluguel mensal isenta de IR para pessoas físicas. Segurança moderada atrelada à qualidade da localização e controle de vacância. Retorno composto por dividendos e ganho de capital de longo prazo.'
        };
    }

    // 10. Seguros e Previdência (BESST - S)
    if (seg.includes('seguro') || seg.includes('previdência') || seg.includes('resseguro') || seg.includes('corretagem de seguros')) {
        return {
            title: 'Seguros & Previdência',
            icon: 'bi-shield-check',
            description: 'Pilares da metodologia BESST (Seguridade). Negócios com modelo de float financeiro e forte geração de caixa recorrente. Altíssima segurança e previsibilidade, blindados de crises severas. Retorno excelente via dividendos consistentes e crescimento orgânico sustentável.'
        };
    }

    // 11. Telecomunicações (BESST - T)
    if (seg.includes('telecom') || seg.includes('telefone') || seg.includes('provedor')) {
        return {
            title: 'Telecomunicações',
            icon: 'bi-phone-fill',
            description: 'Pilares da metodologia BESST (Telecom). Infraestrutura de conectividade essencial no cotidiano. Interessante pela alta previsibilidade de receitas recorrentes por mensalidades. Elevada segurança de fluxo de caixa e retorno sólido focado em dividendos regulares.'
        };
    }

    // 12. Petróleo, Combustíveis e Gás
    if (seg.includes('petróleo') || seg.includes('óleo e gás') || seg.includes('combustív') || seg.includes('petroquímic')) {
        return {
            title: 'Petróleo & Combustíveis',
            icon: 'bi-fuel-pump-fill',
            description: 'Exploração, refino e distribuição de energia fóssil. Interessante em cenários de inflação global e cotações firmes do petróleo. Perfil altamente cíclico: proporciona dividendos extraordinários em ciclos de alta, mas exige monitoramento rigoroso devido à volatilidade da commodity e transição energética.'
        };
    }

    // 13. Mineração e Siderurgia
    if (seg.includes('mineração') || seg.includes('siderurgia') || seg.includes('metal') || seg.includes('metais')) {
        return {
            title: 'Mineração & Siderurgia',
            icon: 'bi-gem',
            description: 'Extração mineral e siderurgia global. Extremamente cíclico, altamente correlacionado com o ciclo econômico internacional e demanda da China. Interessante em janelas específicas de superciclo de commodities. Oferece picos de retornos e dividendos extraordinários, mas baixa previsibilidade a longo prazo.'
        };
    }

    // 14. Saúde, Farmácias e Diagnósticos
    if (seg.includes('saúde') || seg.includes('hospita') || seg.includes('farmac') || seg.includes('diagnóst') || seg.includes('médic') || seg.includes('biotec') || seg.includes('odontolog')) {
        return {
            title: 'Saúde & Farmacêutico',
            icon: 'bi-heart-pulse-fill',
            description: 'Hospitais, redes de drogarias e laboratórios. Demanda inelástica impulsionada pelo envelhecimento populacional. Excelente para perfil defensivo, oferecendo boa segurança de mercado. Retorno equilibrado entre crescimento orgânico, consolidação de redes e resiliência em crises.'
        };
    }

    // 15. Tecnologia e Software
    if (seg.includes('tecnologia') || seg.includes('software') || seg.includes('internet') || seg.includes('dados') || seg.includes('e-commerce') || seg.includes('comunidades financeiras') || seg.includes('programas de fidelidade')) {
        return {
            title: 'Tecnologia & Software',
            icon: 'bi-laptop',
            description: 'Plataformas digitais, SaaS e tecnologia. Interessante em cenários de juros mais baixos e foco em crescimento (growth). Menor previsibilidade de lucros no curto prazo e maior volatilidade (menor segurança tradicional), mas com potencial de retorno exponencial no longo prazo para negócios altamente escaláveis.'
        };
    }

    // 16. Varejo e Consumo
    if (seg.includes('comércio') || seg.includes('varejo') || seg.includes('vestuário') || seg.includes('moda') || seg.includes('consumo') || seg.includes('alimento') || seg.includes('bebida') || seg.includes('atacarejo') || seg.includes('têxtil') || seg.includes('cosmético') || seg.includes('calçado') || seg.includes('joia') || seg.includes('eletrodoméstico') || seg.includes('brinquedos') || seg.includes('utensílio')) {
        return {
            title: 'Varejo & Consumo',
            icon: 'bi-cart-fill',
            description: 'Bens de consumo e comércio em massa. Fortemente correlacionado ao ciclo de juros, emprego e renda disponível (setor altamente cíclico). Interessante apenas em momentos de queda de juros e retomada robusta do consumo interno. Exige cautela com margens apertadas e risco de execução.'
        };
    }

    // 17. Construção Civil e Engenharia
    if (seg.includes('construção') || seg.includes('incorpor') || seg.includes('engenharia') || seg.includes('materiais de construção')) {
        return {
            title: 'Construção Civil & Engenharia',
            icon: 'bi-tools',
            description: 'Incorporação e projetos de engenharia civil. Altamente sensível à taxa de juros (Selic) e ao poder de compra da classe média ou programas habitacionais. Interessante em ciclos de afrouxamento monetário. Retorno potencial elevado, porém com risco operacional e de capital de giro considerável.'
        };
    }

    // 18. Educação
    if (seg.includes('educa')) {
        return {
            title: 'Educação',
            icon: 'bi-mortarboard-fill',
            description: 'Redes de ensino e educação corporativa. Sensível à empregabilidade, renda e políticas públicas de crédito educacional. Perfil moderado a cíclico. Interessante em momentos de reestruturação de custos e expansão digital, oferecendo fluxo de caixa sustentado em marcas consolidadas.'
        };
    }

    return {
        title: 'Indústria & Serviços Diversificados',
        icon: 'bi-briefcase-fill',
        description: 'Empresas industriais e prestadoras de serviços corporativos. Interessante em momentos de expansão industrial (capex aquecido). Segurança e retornos moderados, fortemente atrelados à eficiência operacional e ciclos macroeconômicos.'
    };
};

export const getSegmentIcon = (segment) => {
    return getSegmentDetails(segment).icon;
};