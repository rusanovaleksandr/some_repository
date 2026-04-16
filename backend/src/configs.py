from parsers.parserGUAP import ParserGUAP
from parsers.parserLETI import ParserLETI
from parsers.parserMPU import ParserMPU
from parsers.ParserMTUCI import ParserMTUCI
from parsers.parserSpbPU import ParserSpbPU

mapParsersFromTypeToObject = {
    0: ParserGUAP,
    1: ParserLETI,
    2: ParserMPU,
    3: ParserMTUCI,
    4: ParserSpbPU
}