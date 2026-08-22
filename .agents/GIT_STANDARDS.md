# Padrões de Git

- Commits em português ou inglês, no imperativo, curtos: o que mudou e por
  quê — não uma lista do diff.
- Prefixo por tipo quando ajudar a escanear o log: `fix:`, `feat:`, `refactor:`,
  `test:`, `docs:`, `chore:`.
- Sempre criar um commit novo em vez de `--amend`, a menos que peçam
  explicitamente. Se um pre-commit hook falhar, o commit não aconteceu —
  corrigir e commitar de novo, nunca `--amend` achando que está emendando o
  anterior.
- Nunca `--no-verify`, `--no-gpg-sign` ou pular hooks sem pedido explícito.
- Nunca `push --force`, `reset --hard`, `checkout .`/`restore .` ou qualquer
  comando destrutivo sem pedido explícito. Rodar `git status` antes de
  qualquer um desses para não descartar trabalho em progresso.
- Ao dar `git add`, preferir arquivos específicos a `-A`/`.` para não
  incluir sem querer `.env`, credenciais ou binários grandes.
- Só commitar quando pedido — implementar e deixar o diff pronto para
  revisão não significa que deve virar commit sozinho.
- Bloco `<!-- BEGIN:nextjs-agent-rules -->...<!-- END -->` e
  `<!-- CODEGRAPH_START -->...<!-- CODEGRAPH_END -->` no `AGENTS.md` são
  regenerados automaticamente (por `next dev` e pelo CodeGraph). Removê-los
  do diff só recria a mudança não commitada — inclua-os no commit para
  manter a árvore limpa.
