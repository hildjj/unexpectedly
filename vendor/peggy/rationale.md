I don't want to take a runtime dependency on Peggy just for the
GrammarLocation class.  If this works, I may refactor that into
@peggyjs/grammar-location, but I'm worried about making that change completely
transparent to Peggy users.
