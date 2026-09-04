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
  const mapa: Record<string, unknown[]> = {};
  for (const p of POSTOS_PADRAO) mapa[p] = [];
  for (const row of data ?? []) {
    mapa[row.posto as string] = (row.ocupantes as unknown[]) ?? [];
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

    default:
      return json({ error: `Ação desconhecida: ${acao}` }, 400);
  }
}

export const Route = createFileRoute("/api/public/gm/api")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          return await handle(body);
        } catch (err) {
          console.error("[GM API]", err);
          return json({ error: "Erro interno no servidor." }, 500);
        }
      },
    },
  },
});
