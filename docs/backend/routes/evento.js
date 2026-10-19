const express = require('express');
const router = express.Router();
const db = require('../database').promise(); // AJUSTE: arquivo/variável da sua conexão com o MySQL

const STATUS_VALIDOS = ['agendado', 'concluido', 'cancelado'];

// ---------- Middlewares ----------
function exigirLogin(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({ erro: 'Faça login para continuar.' });
  }
  next();
}

async function exigirAdmin(req, res, next) {
  try {
    if (!req.session || !req.session.usuario) {
      return res.status(401).json({ erro: 'Faça login para continuar.' });
    }
    const [rows] = await db.query('SELECT tipo FROM usuario WHERE id = ?', [req.session.usuario.id]);
    if (rows.length === 0 || rows[0].tipo !== 'admin') {
      return res.status(403).json({ erro: 'Apenas administradores podem fazer isso.' });
    }
    next();
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro no servidor.' });
  }
}

function validarEvento(b) {
  if (!b.titulo || !b.tipo || !b.data_evento || !b.horario || !b.local) {
    return 'Preencha título, tipo, data, horário e local.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.data_evento)) return 'Data inválida.';
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(b.horario)) return 'Horário inválido.';
  return null;
}

// ---------- Quem está usando a página (para o agenda.js) ----------
router.get('/sessao', async (req, res) => {
  try {
    const u = req.session?.usuario;
    if (!u) return res.json({ logado: false, admin: false });
    const [rows] = await db.query('SELECT tipo FROM usuario WHERE id = ?', [u.id]);
    res.json({ logado: true, admin: rows.length > 0 && rows[0].tipo === 'admin' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro no servidor.' });
  }
});

// ---------- Listar eventos (qualquer pessoa) ----------
router.get('/', async (req, res) => {
  try {
    const idUsuario = req.session?.usuario?.id || 0;
    const [rows] = await db.query(
      `SELECT e.id, e.titulo, e.tipo,
              DATE_FORMAT(e.data_evento, '%Y-%m-%d') AS data_evento,
              TIME_FORMAT(e.horario, '%H:%i') AS horario,
              e.local_adm AS local, e.descricao, e.status_adm AS status,
              (SELECT COUNT(*) FROM inscricao_evento i WHERE i.id_evento = e.id) AS total_inscritos,
              EXISTS(SELECT 1 FROM inscricao_evento i
                     WHERE i.id_evento = e.id AND i.id_usuario = ?) AS inscrito
       FROM evento e
       ORDER BY e.data_evento, e.horario`,
      [idUsuario]
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao listar eventos.' });
  }
});

// ---------- Criar evento (admin) ----------
router.post('/', exigirAdmin, async (req, res) => {
  const erro = validarEvento(req.body);
  if (erro) return res.status(400).json({ erro });
  try {
    const { titulo, tipo, data_evento, horario, local, descricao } = req.body;
    const [r] = await db.query(
      `INSERT INTO evento (titulo, tipo, data_evento, horario, local_adm, descricao, id_admin)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [titulo, tipo, data_evento, horario, local, descricao || null, req.session.usuario.id]
    );
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao criar evento.' });
  }
});

// ---------- Editar evento (admin) ----------
router.put('/:id', exigirAdmin, async (req, res) => {
  const erro = validarEvento(req.body);
  if (erro) return res.status(400).json({ erro });
  try {
    const { titulo, tipo, data_evento, horario, local, descricao } = req.body;
    const [r] = await db.query(
      `UPDATE evento SET titulo = ?, tipo = ?, data_evento = ?, horario = ?,
              local_adm = ?, descricao = ?
       WHERE id = ?`,
      [titulo, tipo, data_evento, horario, local, descricao || null, req.params.id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ erro: 'Evento não encontrado.' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao editar evento.' });
  }
});

// ---------- Mudar status (admin) ----------
router.patch('/:id/status', exigirAdmin, async (req, res) => {
  const { status } = req.body;
  if (!STATUS_VALIDOS.includes(status)) {
    return res.status(400).json({ erro: 'Status inválido.' });
  }
  try {
    const [r] = await db.query('UPDATE evento SET status_adm = ? WHERE id = ?', [status, req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ erro: 'Evento não encontrado.' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao mudar status.' });
  }
});

// ---------- Excluir evento (admin) ----------
router.delete('/:id', exigirAdmin, async (req, res) => {
  try {
    const [r] = await db.query('DELETE FROM evento WHERE id = ?', [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ erro: 'Evento não encontrado.' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao excluir evento.' });
  }
});

// ---------- Confirmar presença (usuário logado) ----------
router.post('/:id/inscricao', exigirLogin, async (req, res) => {
  try {
    const [ev] = await db.query('SELECT status_adm FROM evento WHERE id = ?', [req.params.id]);
    if (ev.length === 0) return res.status(404).json({ erro: 'Evento não encontrado.' });
    if (ev[0].status_adm !== 'agendado') {
      return res.status(400).json({ erro: 'Este evento não aceita inscrições.' });
    }
    await db.query(
      'INSERT INTO inscricao_evento (id_evento, id_usuario) VALUES (?, ?)',
      [req.params.id, req.session.usuario.id]
    );
    res.status(201).json({ ok: true });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ erro: 'Você já está inscrito neste evento.' });
    }
    console.error(e);
    res.status(500).json({ erro: 'Erro ao se inscrever.' });
  }
});

// ---------- Cancelar a própria inscrição ----------
router.delete('/:id/inscricao', exigirLogin, async (req, res) => {
  try {
    const [r] = await db.query(
      'DELETE FROM inscricao_evento WHERE id_evento = ? AND id_usuario = ?',
      [req.params.id, req.session.usuario.id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ erro: 'Inscrição não encontrada.' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao cancelar inscrição.' });
  }
});

module.exports = router;