"""Record the supplied local originals and manually reviewed card quadrilaterals.

Coordinates are virtual sharp intersections of the outer card's straight edges,
not sleeve corners, illustration corners, or the tips of rounded corners.
Run only when intentionally rebuilding the source manifest after source review.
"""
import hashlib
import json
from pathlib import Path
from normalize import DATA, read_source

# id, family, original file, TL TR BR BL, photographic limitations
SOURCES = [
('charmander','fire','aoeuaoeu.jpg',[(239,223),(914,230),(869,1120),(262,1118)],'Stand occludes bottom edge; moderate perspective and grain.'),
('oddish','grass','s-l960.jpgaoeu.jpg',[(101,66),(653,80),(635,857),(78,847)],'Uneven illumination; top-right glare.'),
('bulbasaur','grass','s-l1600.jpgaoeu.jpg',[(0,0),(744,0),(744,1040),(0,1040)],'Tightly cropped scan; virtual corner intersections at image bounds.'),
('lickitung-plain','colorless','516677_in_1000x1000.jpg',[(1,1),(658,1),(658,919),(1,919)],'Non-reverse digital comparison; different lighting cannot calibrate opacity directly.'),
('dragonite','dragon','euiddiuidu.jpg',[(148,173),(1022,175),(1056,1426),(119,1434)],'Strong perspective; text and ability bar cover different regions from other Dragons.'),
('dragonair','dragon','euidiuddiu.jpg',[(33,26),(769,26),(769,1063),(28,1066)],'Diffuse scan with edge shadow.'),
('dratini','dragon','euiddui.jpg',[(40,47),(754,45),(760,1038),(46,1041)],'Front card only; back and sleeve explicitly excluded.'),
('lickitung','colorless','euid.jpg',[(132,174),(1029,164),(1042,1437),(124,1445)],'Sleeve reflections; mild perspective.'),
('meowth','colorless','oeuioiue.jpg',[(11,0),(752,0),(752,1027),(9,1027)],'Near-flat scan; some rounded corners clipped.'),
('pidgey','colorless','oeiuouei.jpg',[(61,73),(1144,79),(1105,1533),(89,1528)],'Stand occlusion at bottom; light glare across body.'),
('koffing','darkness','eouioeuioiue.jpg',[(239,418),(912,412),(910,1363),(231,1359)],'Slight perspective; foil texture visible.'),
('grimer','darkness','oeuioeuiiue.jpg',[(1,1),(746,1),(746,1034),(1,1034)],'Low-contrast dark scan.'),
('ekans','darkness','oeiuoueioiue.jpg',[(54,26),(1047,28),(1046,1398),(52,1393)],'Vertical sleeve scratches must not become geometry.'),
('cubone','fighting','oeuioeuiouei.jpg',[(49,61),(1102,59),(1089,1508),(65,1510)],'Stand at bottom; ability and long rules cover central field.'),
('machop','fighting','oeuioeui.jpg',[(337,498),(884,502),(919,1293),(304,1283)],'Small card in photograph; sleeve glare and stand.'),
('sandshrew','fighting','oeuiouie.jpg',[(249,380),(971,360),(967,1417),(211,1383)],'Perspective and strong sleeve glare; covered by long rules.'),
('drowzee','psychic','aoeuoeuoeu.jpg',[(84,85),(1111,91),(1109,1517),(86,1526)],'Top glare and darker lower field; body has little foreground.'),
('gastly','psychic','aoeuaeouueo.jpg',[(36,392),(662,391),(669,1274),(32,1278)],'Portrait photo with card occupying central region.'),
('abra','psychic','aoeuoeu.jpg',[(91,18),(1121,20),(1170,1578),(4,1578)],'Severe perspective; left glare; sparse body text.'),
('magneton','lightning','aoeuaeou.jpg',[(138,124),(929,112),(908,1164),(184,1167)],'Perspective; diffuse reflection.'),
('voltorb','lightning','oeauoueueo.jpg',[(374,145),(1272,139),(1285,1392),(388,1408)],'Stand obscures bottom; clear lower-body geometry.'),
('pikachu','lightning','s-l960.jpgaoeuoaeu.jpg',[(134,140),(596,138),(625,841),(105,836)],'High glare at top; clear high-contrast lower field.'),
('poliwag','water','oaeuaoeuuaeoueo.jpg',[(1,0),(322,0),(322,449),(1,449)],'Very low resolution; registration validation only, not fine edge donor.'),
('psyduck','water','aoeuaoeuuaeo.jpg',[(70,85),(1124,83),(1141,1540),(92,1563)],'Header glare; lower body clear.'),
('growlithe','fire','aoeuaoeuueo.jpg',[(30,23),(775,21),(775,1062),(29,1060)],'Low contrast and scan grain.'),
('vulpix','fire','aoeuauoaoeu.jpg',[(49,12),(1171,17),(1165,1580),(33,1575)],'Scan with sleeve edges; useful lower-body detail.'),
('caterpie','grass','s-l1600.pngaoeu.png',[(363,84),(1029,95),(1041,1020),(357,1024)],'Perspective, top glare, stand covers legal strip.'),
('squirtle','water','aoeuaueoueouoe.png',[(77,90),(1101,89),(1106,1511),(78,1514)],'High-quality scan; grain and minor sleeve shadow.'),
('helix-fossil','trainer','aoeuaoeuuaeo3.jpg',[(20,18),(1145,18),(1144,1586),(19,1585)],'Many text lines; item rule panel occludes bottom-right.'),
('revavroom','metal','s-l500.jpg',[(0,2),(355,1),(355,498),(0,499)],'Low-resolution scan; not a fine edge donor.'),
('forretress','metal','aoeuoeuaeouoeu.jpg',[(17,40),(551,40),(550,777),(18,778)],'Dark scan with extensive body text.'),
('energy-sticker','trainer','aoeuoeuaeoueuo.jpg',[(316,252),(952,279),(920,1107),(380,1215)],'Strong perspective and stand occlusion; useful different Trainer text placement.'),
('old-amber','trainer','aoeuaeouaoeuaoeu.jpg',[(41,46),(1044,41),(1047,1465),(20,1465)],'Grain and horizontal sleeve texture; rule panel occlusion.'),
('varoom','metal','uiuoieuieouie.png',[(288,153),(1293,155),(1230,1430),(344,1429)],'Perspective; stand obscures legal strip; body clear except attack.'),
]

def main():
    root=Path.home()/'Pictures'
    records=[]
    for ident,family,file,corners,notes in SOURCES:
        source=root/file
        image=read_source(source)
        records.append(dict(id=ident,family=family,file=file,sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
            source_size=list(image.shape[1::-1]),corners=corners,corner_method='manual-outer-edge-intersections',
            role='plain-comparison' if ident=='lickitung-plain' else 'reverse-reference',
            inspection=notes,reviewed=True))
    manifest=dict(schema_version=1,coordinate_system={'width':630,'height':880,'units':'card-space','origin':'top-left'},
        source_root_hint='~/Pictures',families=['grass','fire','water','lightning','psychic','fighting','darkness','colorless','dragon','trainer','metal'],
        references=records)
    (DATA/'references/manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(f'Catalogued {len(records)} inspected originals, 11 families; source bytes untouched')

if __name__=='__main__':main()
