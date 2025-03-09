#include "tree_sitter/parser.h"
#include "tree_sitter/array.h"
#include <wctype.h>

enum TokenType
{
  COMMAND,
  ASSIGNMENT
};

static inline void skip(TSLexer *lexer) { lexer->advance(lexer, true); }

static inline void skip_whitespaces(TSLexer *lexer)
{
  while (lexer->lookahead == ' ')
  {
    skip(lexer);
  }
}

void tree_sitter_miniscript_external_scanner_create()
{
}

void tree_sitter_miniscript_external_scanner_destroy()
{
}

bool tree_sitter_miniscript_external_scanner_scan(
    void *payload,
    TSLexer *lexer,
    const bool *valid_symbols)
{
  if (valid_symbols[COMMAND] || valid_symbols[ASSIGNMENT])
  {
    bool has_leading_whitespace = lexer->lookahead == ' ';

    skip_whitespaces(lexer);

    if (lexer->lookahead == 0 || lexer->lookahead == NULL)
    {
      return false;
    }

    if (has_leading_whitespace && lexer->lookahead != '=' && valid_symbols[COMMAND])
    {
      lexer->result_symbol = COMMAND;
      return true;
    }
    else if (lexer->lookahead == '=' && valid_symbols[ASSIGNMENT])
    {
      lexer->advance(lexer, false);
      lexer->result_symbol = ASSIGNMENT;
      return true;
    }
  }

  return false;
}

unsigned tree_sitter_miniscript_external_scanner_serialize()
{
  return 0;
}

void tree_sitter_miniscript_external_scanner_deserialize()
{
}