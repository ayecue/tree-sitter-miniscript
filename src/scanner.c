#include <tree_sitter/parser.h>

enum TokenType
{
  COMMAND,
  ASSIGNMENT,
  EOF,
};

static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

static inline void skip_whitespaces(TSLexer *lexer)
{
  while (lexer->lookahead == ' ')
  {
    skip(lexer);
  }
}

static inline bool is_assignment(TSLexer *lexer)
{
  switch (lexer->lookahead)
  {
  case '+':
  case '-':
  case '*':
  case '/':
  case '%':
    lexer->advance(lexer, false);
    return lexer->lookahead == '=';
  default:
    break;
  }
  return lexer->lookahead == '=';
}

static bool scan(TSLexer *lexer, const bool *valid_symbols) {
  if (valid_symbols[COMMAND] || valid_symbols[ASSIGNMENT] || valid_symbols[EOF])
  {
    bool has_leading_whitespace = lexer->lookahead == ' ';

    skip_whitespaces(lexer);

    if (lexer->eof(lexer))
    {
      if (valid_symbols[EOF])
      {
        lexer->result_symbol = EOF;
        return true;
      }
      return false;
    }

    if (has_leading_whitespace && !is_assignment(lexer) && valid_symbols[COMMAND])
    {
      lexer->result_symbol = COMMAND;
      return true;
    }
    else if (is_assignment(lexer) && valid_symbols[ASSIGNMENT])
    {
      lexer->advance(lexer, false);
      lexer->result_symbol = ASSIGNMENT;
      return true;
    }
  }

  return false;
}

void *tree_sitter_miniscript_external_scanner_create() { return NULL; }
bool tree_sitter_miniscript_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  return scan(lexer, valid_symbols);
}
unsigned tree_sitter_miniscript_external_scanner_serialize(void *payload, char *buffer) { return 0; }
void tree_sitter_miniscript_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {}
void *tree_sitter_miniscript_external_scanner_destroy(void *payload) { return NULL;}