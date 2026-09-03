# NEWBASE

Plataforma automatitzada d'intermediació i descoberta d'oportunitats entre plataformes i mercats d'Àsia, Espanya, Europa i la resta del món.

## Principis obligatoris

- Cost operatiu objectiu: 0 €.
- 0 càrrecs.
- 0 subscripcions.
- 0 afiliació.
- Automatització màxima.
- Català i castellà com a idiomes base; altres idiomes segons mercat.
- Respecte de la legislació i dels termes de cada país i plataforma.
- No scraping quan una font oficial, API, feed o mecanisme autoritzat sigui necessari o preferible.
- No contacte humà rutinari. Intervenció només davant oportunitats de negoci rellevants o riscos que justifiquin perdre automatització.

## Funció

NEWBASE detecta dades i oportunitats disponibles legalment, les normalitza, aplica regles de legalitat i qualitat, compara informació entre mercats i prepara resultats accionables.

El sistema no assumeix que una plataforma ofereix una API. Cada connector s'ha de validar abans d'activar-se.

## Arquitectura inicial

- `config/`: fonts i configuració.
- `connectors/`: integracions amb fonts externes.
- `engine/`: normalització, puntuació i control legal.
- `data/`: esquemes i sortides persistents.
- `monitor/`: processos d'observació automatitzada i generació de sortida.
- `web/`: interfície pública de NEWBASE.

## Flux automàtic actual

`font → connector → detecció → normalització → anàlisi → puntuació → validació → selecció → control de publicació → feed OPVILO → web`

La sortida `data/opvilo-feed.json` només conté oportunitats que han superat el gate de publicació. Els candidats que requereixen revisió es mantenen fora de la sortida pública i entren a la cua automàtica de reavaluació.

## Estat

Fase 2: flux automàtic operatiu amb detector de comerç internacional, historial de moviments, cua de revisió, feed OPVILO i desplegament públic. El detector de comerç s'executa automàticament cada dia i també pot executar-se manualment.
