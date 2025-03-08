;; Keywords

"return" @keyword.return

(break_statement) @keyword

(while_statement
[
  "while"
  "end while"
] @repeat)

(if_statement
[
  "if"
  "elseif"
  "else"
  "then"
  "end if"
] @conditional)

(elseif_statement
[
  "elseif"
  "then"
  "end if"
] @conditional)

(else_statement
[
  "else"
  "end if"
] @conditional)

(for_statement
[
  "for"
  "in"
  "end for"
] @repeat)

(function_declaration
[
  "function"
  "end function"
] @keyword.function)

(function_definition
[
  "function"
  "end function"
] @keyword.function)

;; Operators

[
 "and"
 "not"
 "or"
] @keyword.operator

[
  "+"
  "-"
  "*"
  "/"
  "%"
  "^"
  "#"
  "=="
  "~="
  "<="
  ">="
  "<"
  ">"
  "="
  "&"
  "~"
  "|"
  "<<"
  ">>"
  "//"
  ".."
] @operator

;; Punctuations

[
  ";"
  ":"
  ","
  "."
] @punctuation.delimiter

;; Brackets

[
 "("
 ")"
 "["
 "]"
 "{"
 "}"
] @punctuation.bracket

;; Variables

(identifier) @variable

((identifier) @variable.builtin
 (#eq? @variable.builtin "self"))

;; Constants

(null) @constant.builtin

[
  (false)
  (true)
] @boolean

;; Others

(comment) @comment

(number) @number

(string) @string

(escape_sequence) @string.escape