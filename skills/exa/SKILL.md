---
name: exa
description: Search the web and read pages through Exa, independent of the user’s browser. `exa search` returns clean ranked results; `exa fetch` returns a page as markdown, caching long pages to a file whose path it prints. Use for current information or to read a page by URL.
---

# Exa

Web search and page fetch through Exa's MCP endpoint, with the `exa` helper
beside this file. It is independent of the user's Firefox, so use it to answer
questions or read a URL; use the firefox skill when the page needs their logins
or an interactive session.

```bash
./exa search QUERY [--objective BRIEF] [--num N]  # ranked results; --objective steers ranking
./exa fetch URL... [--chars N]                    # page(s) as markdown
./exa raw TOOL JSON                               # call any MCP tool; prints the raw result
```

- Set `EXA_API_KEY` to lift the free tier's rate limit. It is sent as the
  `exaApiKey` query parameter.
- `exa fetch` returns at most `--chars` characters per page (default 3000) —
  that is Exa’s own cut, which the output reports when it lands.
  - A result of at most 2000 characters prints inline.
  - A longer one is written to `${XDG_CACHE_HOME:-$HOME/.cache}/pi-exa/fetch.*.md`,
    and the printed path holds the full text — read that file rather than
    presuming the preview is whole.
- `--num` sets result count (Exa's default is 10); `--objective` defaults to the
  query.
- A non-2xx response, a JSON-RPC `error`, or a tool `isError` all exit non-zero
  with an `exa:` message on stderr.
- Override the endpoint with `EXA_MCP_URL` to point at a stub.
- `exa raw TOOL JSON` is the escape hatch — it takes the JSON-RPC tool name and
  an arguments object, e.g.
  `./exa raw web_search_exa '{"query":"pi coding agent","numResults":3}'`,
  and prints the result JSON (pipe it to `jq` for fields).
