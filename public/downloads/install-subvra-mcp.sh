#!/usr/bin/env bash
set -euo pipefail

echo "== Subvra MCP auto-install =="

WORKDIR="${SUBVRA_PROJECT_DIR:-$PWD}"
SERVER_CMD='{"type":"stdio","command":"npm","args":["run","mcp:subvra"]}'

add_or_update_cursor() {
  local cfg="$HOME/.cursor/mcp.json"
  mkdir -p "$(dirname "$cfg")"
  if [ ! -f "$cfg" ]; then
    cat > "$cfg" <<EOF
{
  "mcpServers": {
    "subvra": $SERVER_CMD
  }
}
EOF
    echo "Installed Cursor MCP config: $cfg"
    return
  fi

  python3 - "$cfg" "$SERVER_CMD" <<'PY'
import json,sys
path=sys.argv[1]
server=json.loads(sys.argv[2])
with open(path) as f:
    data=json.load(f)
data.setdefault("mcpServers",{})
data["mcpServers"]["subvra"]=server
with open(path,"w") as f:
    json.dump(data,f,indent=2)
    f.write("\n")
print(f"Updated Cursor MCP config: {path}")
PY
}

add_or_update_vscode() {
  local cfg="$HOME/Library/Application Support/Code/User/mcp.json"
  mkdir -p "$(dirname "$cfg")"
  if [ ! -f "$cfg" ]; then
    cat > "$cfg" <<EOF
{
  "servers": {
    "subvra": $SERVER_CMD
  }
}
EOF
    echo "Installed VS Code MCP config: $cfg"
    return
  fi

  python3 - "$cfg" "$SERVER_CMD" <<'PY'
import json,sys
path=sys.argv[1]
server=json.loads(sys.argv[2])
with open(path) as f:
    data=json.load(f)
data.setdefault("servers",{})
data["servers"]["subvra"]=server
with open(path,"w") as f:
    json.dump(data,f,indent=2)
    f.write("\n")
print(f"Updated VS Code MCP config: {path}")
PY
}

echo "Select target client:"
echo "  1) Cursor"
echo "  2) VS Code"
echo "  3) Both"
read -r -p "Choice [1/2/3]: " choice

case "${choice:-3}" in
  1) add_or_update_cursor ;;
  2) add_or_update_vscode ;;
  3) add_or_update_cursor; add_or_update_vscode ;;
  *) echo "Invalid choice"; exit 1 ;;
esac

echo
echo "Next:"
echo "  cd \"$WORKDIR\""
echo "  npm run mcp:subvra"
echo
echo "Then authenticate in agent using tool: mcp_auth(action=set, authToken=...)"
