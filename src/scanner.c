#include "tree_sitter/parser.h"
#include "tree_sitter/array.h"

void *tree_sitter_miniscript_external_scanner_create()
{
  return ts_calloc(1, sizeof(Array(int)));
}

void tree_sitter_miniscript_external_scanner_destroy(void *payload)
{
  Array(int) *array = (Array(int) *)payload;
  array_delete(array);
  ts_free(array);
}

bool tree_sitter_miniscript_external_scanner_scan(
    void *payload,
    TSLexer *lexer,
    const bool *valid_symbols)
{
  return true;
}

unsigned tree_sitter_miniscript_external_scanner_serialize(
    void *payload,
    char *buffer)
{
  return 0;
}

void tree_sitter_miniscript_external_scanner_deserialize(
    void *payload,
    const char *buffer,
    unsigned length)
{
}