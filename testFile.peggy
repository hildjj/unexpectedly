{{
import { mapObj } from './utils.js'
}}


start
  = all:(WS @line? _)|.., EOL| {
    const vars = mapObj(all.filter(t => t && t.hasOwnProperty('name')),
      ({name, ...rest}) => [name, rest])
    return {
      tests: all.filter(t => t && t.hasOwnProperty('expected')),
      vars
    }
  }

line
  = var
  / comment
  / test
  / '' // hack

var
  = '#!' env:"!"? _ name:chunk _ ':' _ value:val _ {
    value.name = name;
    value.env = Boolean(env);
    return value;
  }

val
  = value:chunk {
    const start = location().start;
    return { value, line: start.line, column: start.column}
  }

test
  = expected:results inputs:(LWS @chunk)* comment? {
    const start = location().start;
    return { expected, inputs, line: start.line, column: start.column }
  }

results
  = "!" { return options.EXCEPTION || "!" }
  / chunk

chunk
  = quoted
  / hex
  / word

quoted
  = '"' info:dqchar* '"' { return info.join('') }
  / "'" info:sqchar* "'" { return info.join('') }
  / "`" info:bqchar* "`" { return info.join('') }

dqchar "characters that go inside double quotes, including escaped dquotes"
  = '\\"' { return '"' }
  / qchar
  / $[^\\"]+

sqchar "characters that go inside single quotes, including escaped squotes"
  = "\\'" { return "'" }
  / qchar
  / $[^\\']+

bqchar "characters that go inside back quotes, including escaped bquotes"
  = "\\`" { return "`" }
  / qchar
  / $[^\\`]+

hex
  = '0x' hx:$[a-fA-F0-9]+ { return '0x' + hx.toLowerCase(hx) }

word
  = chars:wchar+ { return chars.join('') }

wchar "words can contain quoted bits"
  = qchar+
  / $[^ #:'"\t\r\n]+

qchar "other quoted characters, as needed"
  = '\\\\' { return '\\' }
  / '\\r' { return '\r' }
  / '\\n' { return '\n' }
  / '\\t' { return '\t' }
  / '\\#' { return '#' }
  / '\\:' { return ':' }
  / '\\ ' { return ' ' }

comment
  = WS "#" [^\r\n]* { return undefined }

_ "optional whitespace"
  = [ \t]* { return undefined }

WS "optional whitespace, including newlines"
  = [ \t\r\n]* { return undefined}

LWS "required whitespace"
  = [ \t]+ { return undefined }

EOL "End of line"
  = '\n'
  / '\r\n'
  / '\r'
