"""Extract only OKED names, risk classes and rates from the supplied workbook."""
from pathlib import Path
from decimal import Decimal
import sys, json, hashlib, re, posixpath
from zipfile import ZipFile
from xml.etree import ElementTree as ET

source = Path(sys.argv[1])
root = Path(__file__).resolve().parents[1]
ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with ZipFile(source) as z:
    strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        strings = [''.join(t.text or '' for t in x.findall('.//s:t', ns)) for x in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si', ns)]
    rels = {x.attrib['Id']: x.attrib['Target'] for x in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    paths = {}
    for s in ET.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet', ns):
        target = rels[s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
        paths[s.attrib['name']] = target.lstrip('/') if target.startswith('/') else posixpath.normpath('xl/' + target)
    def sheet_rows(name):
        for row in ET.fromstring(z.read(paths[name])).findall('s:sheetData/s:row', ns):
            values = {}
            for c in row.findall('s:c', ns):
                col = re.sub(r'\d+', '', c.attrib['r'])
                if col not in ('A','B','C','D','E'): continue
                value = c.find('s:v', ns)
                raw = value.text if value is not None else None
                if c.attrib.get('t') == 's' and raw is not None: raw = strings[int(raw)]
                elif c.attrib.get('t') == 'inlineStr': raw = ''.join(t.text or '' for t in c.findall('.//s:t', ns))
                values[col] = raw
            yield int(row.attrib['r']), values
    entries = {}; duplicate_rows = []; raw_count = 0
    for row, v in sheet_rows('Класс риска'):
        code = (v.get('A') or '').strip()
        if not re.fullmatch(r'\d{5}', code): continue
        raw_count += 1
        bp = Decimal(v['E']) * 10000
        assert abs(bp - bp.to_integral_value()) < Decimal('0.000001') and 0 < bp < 10000, (row, bp)
        bp = bp.to_integral_value()
        entry = {'code': code, 'name': ' '.join(v['B'].split()), 'nameKz': ' '.join((v.get('C') or '').split()), 'riskClass': int(v['D']), 'rateBasisPoints': int(bp), 'sourceRows': [row]}
        if code in entries:
            prev = entries[code]
            assert all(prev[k] == entry[k] for k in ('name','riskClass','rateBasisPoints')), (code,prev,entry)
            if prev['nameKz'] == prev['name']: prev['nameKz'] = entry['nameKz']
            prev['sourceRows'].append(row); duplicate_rows.append({'code':code,'rows':prev['sourceRows']})
        else: entries[code] = entry
    second = {}
    for row, v in sheet_rows('ОТБОР NEW'):
        code = (v.get('A') or '').strip()
        if not re.fullmatch(r'\d{5}',code): continue
        rate = (int(v['C']), int((Decimal(v['D'])*10000).to_integral_value()))
        if code in second: assert second[code] == rate
        second[code] = rate
    assert {k:(v['riskClass'],v['rateBasisPoints']) for k,v in entries.items()} == second
out = {'source': {'file':source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sheet':'Класс риска','range':'A4:E1110','crossCheckedSheet':'ОТБОР NEW','rawRows':raw_count,'uniqueCodes':len(entries),'duplicates':duplicate_rows}, 'entries':sorted(entries.values(),key=lambda v:v['code'])}
destination = root/'src/features/osrns/tariffs.json'
destination.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(out['source'],ensure_ascii=False));print('Classes:',sorted({v['riskClass'] for v in entries.values()}))
