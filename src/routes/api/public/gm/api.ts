import { createFileRoute } from "@tanstack/react-router";

const MATRICULA_DESENVOLVEDOR = "67549";

const POSTOS_PADRAO = [
  "CIOSP",
  "COORDENADOR DE EQUIPE",
  "MOTORISTA",
  "OPERACIONAL",
  "TAC PONTAL CIMA",
  "TAC PONTAL BAIXO",
  "PREFEITURA",
  "PROCURADORIA",
  "FÓRUM",
  "CREAS",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type Admin = Awaited<ReturnType<typeof getAdmin>>;

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

async function enviarPush(tokens: string[], titulo: string, corpo: string, dados?: Record<string, string>) {
  const lovKey = process.env["LOVABLE_API_KEY"];
  const connKey = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!lovKey || !connKey || tokens.length === 0) return { enviados: 0, falhas: tokens.length };

  let enviados = 0;
  let falhas = 0;
  for (const token of tokens) {
    try {
      const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovKey}`,
          "X-Connection-Api-Key": connKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: titulo, body: corpo },
            data: dados || {},
            android: {
              priority: "HIGH",
              notification: {
                sound: "default",
                default_sound: true,
                default_vibrate_timings: true,
                channel_id: "gcm_alertas",
                notification_priority: "PRIORITY_MAX",
              },
            },
            apns: {
              headers: { "apns-priority": "10" },
              payload: { aps: { sound: "default" } },
            },
            webpush: {
              headers: { Urgency: "high" },
              notification: {
                icon: "/brasao-arraial-do-cabo.png",
                badge: "/brasao-arraial-do-cabo.png",
                vibrate: [200, 100, 200],
                requireInteraction: true,
              },
            },
          },
        }),
      });

      if (res.ok) {
        enviados++;
      } else {
        falhas++;
        const text = await res.text().catch(() => "");
        console.warn("[FCM] falha ao enviar para token:", res.status, text);
      }
    } catch (err) {
      falhas++;
      console.warn("[FCM] erro ao enviar push:", err);
    }
  }
  return { enviados, falhas };
}

async function tokensPorMatriculas(db: Admin, matriculas: string[]) {
  if (matriculas.length === 0) return [];
  const { data } = await db
    .from("gm_device_tokens")
    .select("token")
    .in("matricula", matriculas);
  return (data ?? []).map((r) => r.token as string);
}

async function listarUsuarios(db: Admin) {
  const { data } = await db.from("gm_usuarios").select("dados").order("criado_em");
  return (data ?? []).map((r) => r.dados as Record<string, unknown>);
}

async function listarViaturas(db: Admin) {
  const { data } = await db.from("gm_viaturas").select("dados").order("criado_em");
  return (data ?? []).map((r) => r.dados as Record<string, unknown>);
}

async function listarChecklists(db: Admin) {
  const { data } = await db
    .from("gm_checklists")
    .select("dados")
    .order("criado_em", { ascending: false });
  return (data ?? []).map((r) => r.dados as Record<string, unknown>);
}

async function mapaPostos(db: Admin) {
  const { data } = await db.from("gm_postos").select("posto, ocupantes");
  const mapa: Record<string, any[]> = {};
  for (const p of POSTOS_PADRAO) mapa[p] = [];
  for (const row of data ?? []) {
    mapa[row.posto as string] = (row.ocupantes as any[]) ?? [];
  }
  return mapa;
}

function agora() {
  const d = new Date();
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

async function handle(body: any) {
  const db = await getAdmin();
  const acao = String(body?.acao ?? "");

  switch (acao) {
    // ---------------- USUÁRIOS ----------------
    case "usuarios.listar":
      return json(await listarUsuarios(db));

    case "usuarios.cadastro": {
      const u = body.usuario ?? {};
      if (!u.nomeCompleto || !u.nomeDeGuerra || !u.matricula || !u.senha) {
        return json({ error: "Campos obrigatórios ausentes." }, 400);
      }
      const mat = String(u.matricula).trim();
      const isDev = mat === MATRICULA_DESENVOLVEDOR;
      const { data: existente } = await db
        .from("gm_usuarios")
        .select("id, dados")
        .eq("matricula", mat)
        .maybeSingle();
      const anterior = (existente?.dados ?? {}) as any;

      const usuario = {
        ...anterior,
        id: existente?.id ?? `user-${Date.now()}`,
        nomeCompleto: String(u.nomeCompleto).trim(),
        nomeDeGuerra: String(u.nomeDeGuerra).trim().toUpperCase(),
        matricula: mat,
        tipoSanguineo: u.tipoSanguineo ? String(u.tipoSanguineo).trim().toUpperCase() : "N/I",
        grupamento: u.grupamento || "ROMU",
        foto: u.foto !== undefined ? u.foto : anterior.foto,
        senha: String(u.senha),
        status: isDev ? "autorizado" : "pendente",
        isDesenvolvedor: isDev,
        dataCadastro: anterior.dataCadastro ?? agora(),
      };

      await db
        .from("gm_usuarios")
        .upsert({ id: usuario.id, matricula: mat, dados: usuario }, { onConflict: "id" });

      // Notifica o desenvolvedor sobre novo cadastro aguardando autorização
      if (!isDev && !existente) {
        try {
          const tokens = await tokensPorMatriculas(db, [MATRICULA_DESENVOLVEDOR]);
          await enviarPush(
            tokens,
            "Novo cadastro aguardando autorização",
            `${usuario.nomeDeGuerra} (${mat}) • ${usuario.grupamento}`,
            { tipo: "novo_cadastro", matricula: mat },
          );
        } catch (err) {
          console.warn("[Notificação] falha ao avisar desenvolvedor:", err);
        }
      }

      return json({
        success: true,
        usuario,
        mensagem: isDev
          ? "Desenvolvedor cadastrado com sucesso!"
          : "Cadastro enviado para autorização do Desenvolvedor.",
      });
    }

    case "usuarios.status":
    case "usuarios.atualizar": {
      const chave = String(body.usuarioId ?? "");
      const { data: rows } = await db
        .from("gm_usuarios")
        .select("id, dados")
        .or(`id.eq.${chave},matricula.eq.${chave}`)
        .limit(1);
      const row = rows?.[0];
      if (!row) return json({ error: "Usuário não encontrado." }, 404);

      const atual = row.dados as any;
      const atualizado =
        acao === "usuarios.status"
          ? { ...atual, status: body.status }
          : { ...atual, ...(body.dados ?? {}), id: atual.id };

      await db
        .from("gm_usuarios")
        .update({ dados: atualizado, matricula: String(atualizado.matricula) })
        .eq("id", row.id);

      return json({ success: true, usuario: atualizado });
    }

    case "usuarios.excluir": {
      const chave = String(body.usuarioId ?? "");
      await db.from("gm_usuarios").delete().or(`id.eq.${chave},matricula.eq.${chave}`);
      return json({ success: true });
    }

    case "usuarios.zerar": {
      await db.from("gm_usuarios").delete().neq("matricula", MATRICULA_DESENVOLVEDOR);
      return json({ success: true, usuarios: await listarUsuarios(db) });
    }

    // ---------------- POSTOS ----------------
    case "postos.listar":
      return json(await mapaPostos(db));

    case "postos.ocupar": {
      const { posto, ocupante } = body;
      if (!posto || !ocupante?.matricula) {
        return json({ error: "Posto e dados do ocupante são obrigatórios." }, 400);
      }
      const mapa = await mapaPostos(db);
      for (const p of Object.keys(mapa)) {
        mapa[p] = (mapa[p] ?? []).filter((o: any) => o.matricula !== ocupante.matricula);
      }
      mapa[posto] = [...(mapa[posto] ?? []), ocupante];
      await db.from("gm_postos").upsert(
        Object.entries(mapa).map(([p, ocupantes]) => ({ posto: p, ocupantes })),
        { onConflict: "posto" },
      );
      return json({ success: true, postos: mapa });
    }

    case "postos.desocupar": {
      const { posto, matricula } = body;
      const mapa = await mapaPostos(db);
      if (posto && mapa[posto]) {
        mapa[posto] = (mapa[posto] ?? []).filter((o: any) => o.matricula !== matricula);
      } else if (matricula) {
        for (const p of Object.keys(mapa)) {
          mapa[p] = (mapa[p] ?? []).filter((o: any) => o.matricula !== matricula);
        }
      }
      await db.from("gm_postos").upsert(
        Object.entries(mapa).map(([p, ocupantes]) => ({ posto: p, ocupantes })),
        { onConflict: "posto" },
      );
      return json({ success: true, postos: mapa });
    }

    case "postos.limpar": {
      const mapa = await mapaPostos(db);
      for (const p of Object.keys(mapa)) mapa[p] = [];
      await db.from("gm_postos").upsert(
        Object.entries(mapa).map(([p, ocupantes]) => ({ posto: p, ocupantes })),
        { onConflict: "posto" },
      );
      return json({ success: true, postos: mapa });
    }

    // ---------------- VIATURAS ----------------
    case "viaturas.listar":
      return json(await listarViaturas(db));

    case "viaturas.salvar": {
      const v = body.viatura ?? {};
      if (!v.prefixo || !v.placa) {
        return json({ error: "Prefixo e placa são obrigatórios." }, 400);
      }
      const id = v.id || `vtr-${Date.now()}`;
      const { data: existente } = await db
        .from("gm_viaturas")
        .select("dados")
        .eq("id", id)
        .maybeSingle();
      const viatura = {
        ...((existente?.dados as any) ?? {}),
        ...v,
        id,
        dataCadastro: v.dataCadastro || new Date().toLocaleDateString("pt-BR"),
      };
      await db.from("gm_viaturas").upsert({ id, dados: viatura }, { onConflict: "id" });
      return json({ success: true, viatura });
    }

    case "viaturas.excluir": {
      await db.from("gm_viaturas").delete().eq("id", String(body.id));
      return json({ success: true });
    }

    // ---------------- CHECKLISTS ----------------
    case "checklists.listar":
      return json(await listarChecklists(db));

    case "checklists.criar": {
      const c = body.checklist ?? {};
      if (!c.viaturaId || !c.kmAtual) {
        return json({ error: "Viatura e quilometragem são obrigatórios." }, 400);
      }
      const id = c.id || `chk-${Date.now()}`;
      const checklist = { ...c, id };
      await db.from("gm_checklists").insert({ id, dados: checklist });

      const { data: vtr } = await db
        .from("gm_viaturas")
        .select("dados")
        .eq("id", c.viaturaId)
        .maybeSingle();
      if (vtr) {
        await db
          .from("gm_viaturas")
          .update({ dados: { ...(vtr.dados as any), kmAtual: c.kmAtual } })
          .eq("id", c.viaturaId);
      }
      return json({ success: true, checklist });
    }

    // ---------------- ORDENS DE SERVIÇO ----------------
    case "ordens.listar": {
      const { data } = await db
        .from("gm_ordens")
        .select("dados")
        .order("criado_em", { ascending: false })
        .limit(100);
      return json((data ?? []).map((r) => r.dados as Record<string, unknown>));
    }

    case "ordens.criar": {
      const o = body.ordem ?? {};
      if (!o.grupamento || !o.endereco || !o.descricao) {
        return json({ error: "Grupamento, endereço e descrição são obrigatórios." }, 400);
      }
      const id = o.id || `os-${Date.now()}`;
      const ordem = {
        observacoes: "",
        ...o,
        id,
        status: "aguardando",
        dataHora: o.dataHora || agora(),
      };
      await db.from("gm_ordens").upsert({ id, dados: ordem }, { onConflict: "id" });

      // Notifica ocupantes do grupamento destino
      try {
        const mapa = await mapaPostos(db);
        const ocupantes = (mapa[o.grupamento as string] ?? []) as any[];
        const matriculas = ocupantes.map((oc) => String(oc.matricula ?? "")).filter(Boolean);
        if (matriculas.length > 0) {
          await enviarPush(
            await tokensPorMatriculas(db, matriculas),
            `Nova ordem de serviço • ${o.grupamento}`,
            `${o.descricao} – ${o.endereco}`,
            { ordemId: id, tipo: "nova_ordem" }
          );
        }
      } catch (err) {
        console.warn("[Notificação] falha ao notificar grupamento:", err);
      }

      return json({ success: true, ordem });
    }

    case "ordens.atualizar": {
      const id = String(body.id ?? "");
      const { data: existente } = await db
        .from("gm_ordens")
        .select("dados")
        .eq("id", id)
        .maybeSingle();
      if (!existente) return json({ error: "Ordem não encontrada." }, 404);
      const anterior = (existente.dados as any) ?? {};
      const ordem = { ...anterior, ...(body.dados ?? {}), id };
      await db.from("gm_ordens").update({ dados: ordem }).eq("id", id);

      // Notifica CIOSP quando reboque é acionado
      if (body.dados?.reboqueAcionado && !anterior.reboqueAcionado) {
        try {
          const mapa = await mapaPostos(db);
          const ocupantes = (mapa["CIOSP"] ?? []) as any[];
          const matriculas = ocupantes.map((oc) => String(oc.matricula ?? "")).filter(Boolean);
          if (matriculas.length > 0) {
            await enviarPush(
              await tokensPorMatriculas(db, matriculas),
              "Reboque acionado",
              `${ordem.descricao} – ${ordem.endereco}`,
              { ordemId: id, tipo: "reboque" }
            );
          }
        } catch (err) {
          console.warn("[Notificação] falha ao notificar CIOSP:", err);
        }
      }

      return json({ success: true, ordem });
    }

    case "ordens.excluir": {
      await db.from("gm_ordens").delete().eq("id", String(body.id));
      return json({ success: true });
    }

    // ---------------- DISPOSITIVOS / NOTIFICAÇÕES ----------------
    case "dispositivos.registrar": {
      const matricula = String(body.matricula ?? "").trim();
      const token = String(body.token ?? "").trim();
      if (!matricula || !token) {
        return json({ error: "Matrícula e token são obrigatórios." }, 400);
      }
      const id = `dt-${matricula}-${token.slice(-24)}`;
      await db
        .from("gm_device_tokens")
        .upsert({ id, matricula, token, dados: {} }, { onConflict: "id" });
      return json({ success: true });
    }

    case "notificacoes.enviar": {
      const matriculas = Array.isArray(body.matriculas) ? body.matriculas.map(String) : [];
      const titulo = String(body.titulo ?? "");
      const corpo = String(body.corpo ?? "");
      if (!titulo || !corpo) {
        return json({ error: "Título e corpo são obrigatórios." }, 400);
      }
      const tokens = await tokensPorMatriculas(db, matriculas);
      const resultado = await enviarPush(tokens, titulo, corpo, body.dados || {});
      return json({ success: true, ...resultado });
    }

    // ---------------- RÁDIO / CHAT ----------------
    case "chat.listar": {
      const canal = String(body.canal ?? "");
      if (!canal) return json({ error: "Canal é obrigatório." }, 400);
      const { data } = await db
        .from("gm_chat_mensagens")
        .select("dados, criado_em")
        .eq("canal", canal)
        .order("criado_em", { ascending: false })
        .limit(200);
      const lista = (data ?? [])
        .map((r) => ({ ...(r.dados as Record<string, unknown>), criadoEm: r.criado_em }))
        .reverse();
      return json(lista);
    }

    case "chat.enviar": {
      const canal = String(body.canal ?? "");
      const m = body.mensagem ?? {};
      if (!canal || !m.autorMatricula || (!m.texto && !m.audio)) {
        return json({ error: "Canal, autor e conteúdo são obrigatórios." }, 400);
      }
      const id = m.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const mensagem = {
        ...m,
        id,
        canal,
        autorMatricula: String(m.autorMatricula),
        dataHora: m.dataHora || agora(),
      };
      await db.from("gm_chat_mensagens").insert({
        id,
        canal,
        autor_matricula: mensagem.autorMatricula,
        dados: mensagem,
      });

      // Avisa os destinatários no aparelho
      try {
        const usuarios = await listarUsuarios(db);
        let destinos: string[] = [];
        if (canal === "geral") {
          destinos = usuarios.map((u) => String(u["matricula"] ?? ""));
        } else if (canal.startsWith("grupamento:")) {
          const sigla = canal.slice("grupamento:".length);
          destinos = usuarios
            .filter((u) => String(u["grupamento"] ?? "") === sigla)
            .map((u) => String(u["matricula"] ?? ""));
        } else if (canal.startsWith("dm:")) {
          destinos = canal.slice(3).split("|");
        }
        destinos = destinos.filter((mt) => mt && mt !== mensagem.autorMatricula);
        if (destinos.length > 0) {
          const rotulo =
            canal === "geral"
              ? "Rádio • Chat geral"
              : canal.startsWith("grupamento:")
                ? `Rádio • ${canal.slice("grupamento:".length)}`
                : "Rádio • Mensagem particular";
          await enviarPush(
            await tokensPorMatriculas(db, destinos),
            rotulo,
            `${mensagem.autorNome || mensagem.autorMatricula}: ${
              mensagem.audio ? "enviou um áudio" : String(mensagem.texto).slice(0, 120)
            }`,
            { tipo: "chat", canal },
          );
        }
      } catch (err) {
        console.warn("[Chat] falha ao notificar:", err);
      }

      return json({ success: true, mensagem });
    }

    default:
      return json({ error: `Ação desconhecida: ${acao}` }, 400);
  }
}


export const Route = createFileRoute("/api/public/gm/api")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: any;
        try {
          const texto = await request.text();
          body = texto ? JSON.parse(texto) : {};
        } catch {
          return json({ error: "Corpo da requisição inválido (JSON esperado)." }, 400);
        }
        try {
          return await handle(body);
        } catch (err) {
          const mensagem = err instanceof Error ? err.message : String(err);
          console.error("[GM API]", body?.acao, mensagem, err);
          return json({ error: `Erro interno no servidor: ${mensagem}` }, 500);
        }
      },
    },
  },
});

