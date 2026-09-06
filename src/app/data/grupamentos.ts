import imgGtran from '../assets/images/brasao_gtran_1788480487910.jpg';
import imgRomu from '../assets/images/brasao_romu_1788480497594.jpg';
import imgGres from '../assets/images/brasao_gres_1788480507599.jpg';
import imgGoc from '../assets/images/brasao_goc_1788480517411.jpg';
import imgGid from '../assets/images/brasao_gid_1788480527526.jpg';
import imgCentral from '../assets/images/brasao_central.jpg';
import imgInspetoria from '../assets/images/brasao_inspetoria.jpg';
import { GrupamentoItem } from '../types';

export const MATRICULA_DESENVOLVEDOR = '67549';

export const GRUPAMENTOS: GrupamentoItem[] = [
  {
    sigla: 'GTRAN',
    nome: 'Grupamento de Trânsito',
    imagem: imgGtran,
  },
  {
    sigla: 'ROMU',
    nome: 'Rondas Ostensivas Municipais',
    imagem: imgRomu,
  },
  {
    sigla: 'GRES',
    nome: 'Grupamento de Resgate e Salvamento',
    imagem: imgGres,
  },
  {
    sigla: 'GOC',
    nome: 'Grupamento de Operações com Cães',
    imagem: imgGoc,
  },
  {
    sigla: 'GID',
    nome: 'Grupamento de Inteligência e Defesa',
    imagem: imgGid,
  },
  {
    sigla: 'CENTRAL',
    nome: 'Central de Operações (CIOSP)',
    imagem: imgCentral,
  },
  {
    sigla: 'INSPETORIA',
    nome: 'Inspetoria Geral',
    imagem: imgInspetoria,
  },
];
