# Connectors

Cada connector representa una font externa concreta.

## Regles obligatòries

1. Identificar país/mercat i operador.
2. Confirmar API, feed, webhook o exportació oficial quan existeixi.
3. Revisar termes d'ús, llicència i restriccions territorials.
4. Confirmar cost 0 €, absència de subscripció obligatòria i absència d'afiliació obligatòria.
5. Confirmar que l'ús previst, inclòs comercial quan correspongui, està permès.
6. Documentar autenticació, límits i atribució necessària.
7. No fer scraping quan existeixi una via oficial adequada.
8. No activar una font si la seva situació legal o contractual no està clara.

Els connectors no poden saltar el filtre legal de `engine/legal.js`.

## Connector inicial

`data-gov-sg.js` utilitza l'API pública oficial de data.gov.sg. És un connector tècnic inicial; cada dataset concret s'ha de validar segons la seva llicència i termes abans d'ús comercial o redistribució.
