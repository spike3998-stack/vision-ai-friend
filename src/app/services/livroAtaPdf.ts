import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrdemServico, ChecklistViatura, UsuarioCadastrado } from '../types';

interface Params {
  sigla: string;
  data: string; // dd/mm/aaaa
  ordens: OrdemServico[];
  checklists: ChecklistViatura[];
  usuario: UsuarioCadastrado | null;
  brasaoUrl?: string | undefined;
}

/** Carrega uma imagem (URL ou dataURL) como dataURL para embutir no PDF. */
async function carregarImagem(url: string): Promise<string | null> {
  try {
    if (url.startsWith('data:')) return url;
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === 'string' ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function apenasHora(valor?: string): string {
  if (!valor) return '--:--';
  const m = valor.match(/(\d{2}:\d{2})/);
  return m ? m[1]! : '--:--';
}

export async function gerarLivroAtaPdf({
  sigla,
  data,
  ordens,
  checklists,
  usuario,
  brasaoUrl,
}: Params): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const largura = doc.internal.pageSize.getWidth();
  const margem = 14;
  let y = margem;

  const brasao = brasaoUrl ? await carregarImagem(brasaoUrl) : null;

  /* ---------- CABEÇALHO ---------- */
  if (brasao) {
    try {
      doc.addImage(brasao, 'JPEG', largura / 2 - 14, y, 28, 28);
    } catch {
      try {
        doc.addImage(brasao, 'PNG', largura / 2 - 14, y, 28, 28);
      } catch {
        /* sem brasão */
      }
    }
  }
  y += 33;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`LIVRO DIÁRIO ${sigla}`, largura / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(11);
  doc.text('GUARDA CIVIL MUNICIPAL DE ARRAIAL DO CABO', largura / 2, y, { align: 'center' });
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`LIVRO DIÁRIO DE PLANTÃO - ${sigla} (${data})`, largura / 2, y, { align: 'center' });
  y += 8;
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.6);
  doc.line(margem, y, largura - margem, y);
  y += 8;

  /* ---------- 1. DOCUMENTO DE PLANTÃO ---------- */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('1. DOCUMENTO DE PLANTÃO REGISTRADO', margem, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`GRUPO/GUARNIÇÃO: ${sigla}`, margem, y + 4);

  autoTable(doc, {
    startY: y + 8,
    margin: { left: margem, right: margem },
    head: [['DADOS DO SERVIÇO', 'INFORMAÇÃO']],
    body: [
      ['DATA DO PLANTÃO', data],
      [
        'LIVRO CONSULTADO POR',
        (usuario?.nomeDeGuerra || '---').toUpperCase(),
      ],
      ['MATRÍCULA DO RESPONSÁVEL', usuario?.matricula || '---'],
      ['TOTAL DE ORDENS NO DIA', String(ordens.length)],
      ['TOTAL DE CHECKLIST DE VIATURAS', String(checklists.length)],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [241, 245, 249] },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  /* ---------- 2. OCORRÊNCIAS DO PLANTÃO ---------- */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('2. OCORRÊNCIAS / ORDENS DE SERVIÇO DO PLANTÃO', margem, y);
  y += 4;

  if (ordens.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Nenhuma ocorrência registrada nesta data.', margem, y + 5);
    y += 12;
  } else {
    const assinaturas = ordens.map((o) => o.assinaturaFinalizacao || null);
    const linhas = ordens.map((o, i) => [
      String(i + 1),
      apenasHora(o.dataHora),
      data,
      `${o.ehApoio ? 'VIA APOIO' : 'VIA CIOSP'}${o.apoioGrupamento ? `, APOIO (${o.apoioGrupamento})` : ''}\n${o.descricao.toUpperCase()}`,
      o.endereco.toUpperCase(),
      o.equipe && o.equipe.length > 0
        ? o.equipe.map((m) => m.nomeDeGuerra.toUpperCase()).join(', ')
        : o.respondidoPor
          ? o.respondidoPor.toUpperCase()
          : 'PLANTÃO',
      `${o.status.toUpperCase()}${o.viaturaPrefixo ? `\nVTR: ${o.viaturaPrefixo}` : ''}${o.reboqueAcionado ? '\nREBOQUE ACIONADO' : ''}${o.relato ? `\nRELATO: ${o.relato}` : ''}${o.motivoRecusa ? `\nMOTIVO DA RECUSA: ${o.motivoRecusa}` : ''}${o.motivoEspera ? `\nMOTIVO DA ESPERA${o.esperaMinutos ? ` (${o.esperaMinutos} MIN)` : ''}: ${o.motivoEspera}` : ''}${o.fotos?.length ? `\n${o.fotos.length} foto(s)` : ''}`,
      o.finalizadoPor ? `${o.finalizadoPor.toUpperCase()}\nMAT. ${o.finalizadoPorMatricula || '---'}` : '',
    ]);
    autoTable(doc, {
      startY: y,
      margin: { left: margem, right: margem },
      head: [['#', 'HORÁRIO', 'DATA', 'NATUREZA / TIPO', 'ENDEREÇO / LOCAL', 'EQUIPE', 'DETALHES / REGISTRO', 'ASSINATURA']],
      body: linhas,
      styles: { fontSize: 7, cellPadding: 1.6, overflow: 'linebreak' },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 13 },
        2: { cellWidth: 16 },
        5: { cellWidth: 24 },
        7: { cellWidth: 30, minCellHeight: 18, valign: 'bottom', halign: 'center', fontSize: 6 },
      },
      didDrawCell: (dados: any) => {
        if (dados.section !== 'body' || dados.column.index !== 7) return;
        const img = assinaturas[dados.row.index];
        if (!img) return;
        try {
          doc.addImage(
            img,
            'PNG',
            dados.cell.x + 2,
            dados.cell.y + 1,
            dados.cell.width - 4,
            Math.min(12, dados.cell.height - 6),
          );
        } catch {
          /* assinatura indisponível */
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  /* ---------- 3. CHECKLIST DE VIATURAS ---------- */
  if (checklists.length > 0) {
    if (y > 250) {
      doc.addPage();
      y = margem;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('3. CHECKLIST DE VIATURAS DO PLANTÃO', margem, y);
    y += 4;
    autoTable(doc, {
      startY: y,
      margin: { left: margem, right: margem },
      head: [['#', 'HORÁRIO', 'VIATURA', 'PLACA', 'KM', 'COMBUSTÍVEL', 'MOTORISTA', 'STATUS']],
      body: checklists.map((c, i) => [
        String(i + 1),
        apenasHora(c.dataHora),
        c.prefixoViatura,
        c.placaViatura,
        c.kmAtual,
        c.nivelCombustivel.replace('_', '/').toUpperCase(),
        c.motoristaNome.toUpperCase(),
        c.statusGeral.replace(/_/g, ' ').toUpperCase(),
      ]),
      styles: { fontSize: 8, cellPadding: 1.8 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  /* ---------- ENCERRAMENTO ---------- */
  if (y > 250) {
    doc.addPage();
    y = margem;
  }
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ENCERRAMENTO DO PLANTÃO', margem, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`ARRAIAL DO CABO R.J. DATA: ${data}`, margem, y);
  y += 6;

  // Assinatura do COORDENADOR DE EQUIPE do plantão
  const comCoordenador = [...ordens].reverse().find((o) => o.assinaturaCoordenador);
  const coordNome = comCoordenador?.coordenadorNome || usuario?.nomeDeGuerra || 'RESPONSÁVEL';
  const coordMat = comCoordenador?.coordenadorMatricula || usuario?.matricula || '---';
  if (comCoordenador?.assinaturaCoordenador) {
    try {
      doc.addImage(comCoordenador.assinaturaCoordenador, 'PNG', largura / 2 - 30, y, 60, 18);
    } catch {
      /* assinatura indisponível */
    }
  }
  y += 20;
  doc.line(largura / 2 - 40, y, largura / 2 + 40, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(coordNome.toUpperCase(), largura / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`COORDENADOR DE EQUIPE — GCM ${sigla} — MAT. ${coordMat}`, largura / 2, y, {
    align: 'center',
  });

  /* ---------- ARQUIVO DE FOTOS ---------- */
  const comFotos = ordens.filter((o) => o.fotos && o.fotos.length > 0);
  if (comFotos.length > 0) {
    doc.addPage();
    let fy = margem;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('ARQUIVO DE FOTOS DO PLANTÃO (LIVRO DIÁRIO)', largura / 2, fy, { align: 'center' });
    fy += 10;

    for (const ordem of comFotos) {
      for (const foto of ordem.fotos ?? []) {
        const img = await carregarImagem(foto);
        if (!img) continue;
        if (fy > 200) {
          doc.addPage();
          fy = margem;
        }
        try {
          doc.addImage(img, 'JPEG', margem, fy, 80, 60);
        } catch {
          continue;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const tx = margem + 86;
        doc.text(ordem.descricao.toUpperCase().slice(0, 60), tx, fy + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`REGISTRO: ${ordem.dataHora}`, tx, fy + 12);
        doc.text(`LOCAL: ${ordem.endereco.toUpperCase().slice(0, 55)}`, tx, fy + 18);
        doc.text(
          `EQUIPE: ${(ordem.equipe?.map((m) => m.nomeDeGuerra.toUpperCase()).join(', ') || ordem.respondidoPor?.toUpperCase() || 'PLANTÃO').slice(0, 55)}`,
          tx,
          fy + 24,
        );
        if (ordem.relato) {
          const relato = doc.splitTextToSize(
            `RELATO: ${ordem.relato.toUpperCase()}`,
            largura - margem - tx,
          ) as string[];
          doc.text(relato.slice(0, 5), tx, fy + 30);
        }
        fy += 68;
      }
    }
  }

  doc.save(`Livro_Diario_${sigla}_${data.replace(/\//g, '-')}.pdf`);
}
