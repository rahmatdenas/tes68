'use strict';

const BASE_TITLE = 'WikiSurau';

// ==========================================
// KAMUS KUERI 0 (MENARIK DATA DAN WILAYAH)
// ==========================================
const KUMPULAN_KUERI_0 = {
  // 1. Kategori General (Bangunan fisik, menggunakan P131+)
  'general': `SELECT DISTINCT ?siteQid ?siteLabel ?provinsiQid ?provinsiLabel ?p131LokasiLabel ?tahunBerdiriMentah ?tahunPresisi
  WHERE {
    <PLACEHOLDER_WILAYAH>
    VALUES ?jenis { <PLACEHOLDER_JENIS> }
    
    ?site wdt:P31 ?jenis ;
          wdt:P131+ ?provinsi .
    
    OPTIONAL { ?site wdt:P131 ?p131Lokasi . }
        
    OPTIONAL { 
      ?site p:P571 ?inceptionStmt .
      ?inceptionStmt psv:P571 ?inceptionNode .
      ?inceptionNode wikibase:timeValue ?tahunBerdiriMentah ;
                     wikibase:timePrecision ?tahunPresisi .
    }
    
    BIND(SUBSTR(STR(?site), 32) AS ?siteQid) .
    BIND(SUBSTR(STR(?provinsi), 32) AS ?provinsiQid) .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "id". }
  }`,

  // 2. Kategori Pers (Surat kabar/Majalah, menggunakan P159 -> P131+)
  'pers': `SELECT DISTINCT ?siteQid ?siteLabel ?provinsiQid ?provinsiLabel ?p131LokasiLabel ?tahunBerdiriMentah ?tahunPresisi
  WHERE {
    <PLACEHOLDER_WILAYAH>
    VALUES ?jenis { <PLACEHOLDER_JENIS> }
    
    ?site wdt:P31 ?jenis ;
          wdt:P159 ?kantor .
    ?kantor wdt:P131+ ?provinsi .
    
    OPTIONAL { ?kantor wdt:P131 ?p131Lokasi . }
        
    OPTIONAL { 
      ?site p:P571 ?inceptionStmt .
      ?inceptionStmt psv:P571 ?inceptionNode .
      ?inceptionNode wikibase:timeValue ?tahunBerdiriMentah ;
                     wikibase:timePrecision ?tahunPresisi .
    }
    
    BIND(SUBSTR(STR(?site), 32) AS ?siteQid) .
    BIND(SUBSTR(STR(?provinsi), 32) AS ?provinsiQid) .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "id". }
  }`,

  // 3. Kategori Wilayah Administratif (Kabupaten/Kota, menggunakan P131*)
  'wilayah': `SELECT DISTINCT ?siteQid ?siteLabel ?provinsiQid ?provinsiLabel ?p131LokasiLabel ?tahunBerdiriMentah ?tahunPresisi
  WHERE {
    <PLACEHOLDER_WILAYAH>
    VALUES ?jenis { <PLACEHOLDER_JENIS> }
    
    ?site wdt:P31 ?jenis ;
          wdt:P131* ?provinsi .
    
    OPTIONAL { ?site wdt:P131 ?p131Lokasi . }
        
    OPTIONAL { 
      ?site p:P571 ?inceptionStmt .
      ?inceptionStmt psv:P571 ?inceptionNode .
      ?inceptionNode wikibase:timeValue ?tahunBerdiriMentah ;
                     wikibase:timePrecision ?tahunPresisi .
    }
    
    BIND(SUBSTR(STR(?site), 32) AS ?siteQid) .
    BIND(SUBSTR(STR(?provinsi), 32) AS ?provinsiQid) .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "id". }
  }`
};

// ==========================================
// KAMUS KUERI 1 (MENARIK KOORDINAT)
// ==========================================
const KUMPULAN_KUERI_1 = {
  'general': `SELECT DISTINCT ?siteQid ?coord WHERE {
    VALUES ?site { <PLACEHOLDER_QIDS> }
    ?site p:P625 ?coordStatement .
    ?coordStatement ps:P625 ?coord .
    FILTER NOT EXISTS { ?coordStatement pq:P518 ?x }
    BIND (SUBSTR(STR(?site), 32) AS ?siteQid) .
  } ,
  
   'pers': `SELECT DISTINCT ?siteQid ?coord WHERE {
    VALUES ?site { <PLACEHOLDER_QIDS> }
    ?site wdt:P159 ?kantor .
    ?kantor p:P625 ?coordStatement .
    ?coordStatement ps:P625 ?coord .
    FILTER NOT EXISTS { ?coordStatement pq:P518 ?x }
    BIND (SUBSTR(STR(?site), 32) AS ?siteQid) .
  },
  
  'wilayah': `SELECT DISTINCT ?siteQid ?coord WHERE {
    VALUES ?site { <PLACEHOLDER_QIDS> }
    ?site p:P625 ?coordStatement .
    ?coordStatement ps:P625 ?coord .
    FILTER NOT EXISTS { ?coordStatement pq:P518 ?x }
    BIND (SUBSTR(STR(?site), 32) AS ?siteQid) .
  }
};

// ==========================================
// KUERI 3 (GAMBAR & ARTIKEL) - Tetap Tunggal karena rumusnya sama untuk semua
// ==========================================
const SPARQL_QUERY_3_TEMPLATE =
`SELECT ?siteQid (SAMPLE(?imgUtama) AS ?image) (SAMPLE(?wikiTitle) AS ?wikipediaUrlTitle) WHERE {
  VALUES ?site { <PLACEHOLDER_QIDS> }
  OPTIONAL {
    ?site p:P18 ?imageStatement .
    ?imageStatement ps:P18 ?imgUtama .
    FILTER NOT EXISTS { ?imageStatement pq:P3831 wd:Q16189205 }
    FILTER NOT EXISTS { ?imageStatement pq:P180 wd:Q192630 }
  }
  OPTIONAL {
    ?wikipedia schema:about ?site ;
               schema:isPartOf <https://id.wikipedia.org/> .
    BIND (SUBSTR(STR(?wikipedia), 31) AS ?wikiTitle) .
  }
  BIND (SUBSTR(STR(?site), 32) AS ?siteQid) .
} GROUP BY ?siteQid`;

function getSparqlQuery4(qid) {
  return `SELECT ?siteQid ?eventLabel ?pointInTime ?ptPrecision ?startTime ?stPrecision ?endTime ?etPrecision WHERE {
    VALUES ?site { wd:${qid} }
    ?site p:P793 ?eventStatement .
    ?eventStatement ps:P793 ?event .
    ?event rdfs:label ?eventLabel . 
    FILTER(LANG(?eventLabel) = "id") .
    OPTIONAL { 
      ?eventStatement pqv:P585 ?ptNode .
      ?ptNode wikibase:timeValue ?pointInTime ;
              wikibase:timePrecision ?ptPrecision .
    }
    OPTIONAL { 
      ?eventStatement pqv:P580 ?stNode .
      ?stNode wikibase:timeValue ?startTime ;
              wikibase:timePrecision ?stPrecision .
    }
    OPTIONAL { 
      ?eventStatement pqv:P582 ?etNode .
      ?etNode wikibase:timeValue ?endTime ;
              wikibase:timePrecision ?etPrecision .
    }
    BIND (SUBSTR(STR(?site), 32) AS ?siteQid) .
  }`;
}

function getSparqlQuery5(qid) {
  return `SELECT ?siteQid ?vicinityImage ?vicinityCaption ?pastImage ?pastCaption WHERE {
    VALUES ?site { wd:${qid} }
    OPTIONAL {
      ?site p:P18 ?vicinityStatement .
      ?vicinityStatement ps:P18 ?vicinityImage .
      FILTER EXISTS { ?vicinityStatement pq:P3831 wd:Q16189205 }
      OPTIONAL {
        ?vicinityStatement pq:P2096 ?vicinityCaption .
        FILTER(LANG(?vicinityCaption) = "id")
      }
    }
    OPTIONAL {
      ?site p:P18 ?pastImgStmt .
      ?pastImgStmt ps:P18 ?pastImage .
      ?pastImgStmt pq:P180 wd:Q192630 .
      OPTIONAL {
        ?pastImgStmt pq:P2096 ?pastCaption .
        FILTER(LANG(?pastCaption) = "id")
      }
    }
    BIND (SUBSTR(STR(?site), 32) AS ?siteQid) .
  }`;
}

function getSparqlQuery6(qid) {
  return `SELECT ?siteQid ?kapasitas ?commonsCat ?kondisiLabel WHERE {
    VALUES ?site { wd:${qid} }
    OPTIONAL { ?site wdt:P373 ?commonsCat . }
    OPTIONAL { ?site wdt:P1083 ?kapasitas . }
    OPTIONAL { 
      ?site wdt:P5817 ?kondisiNode . 
      ?kondisiNode rdfs:label ?kondisiLabel .
      FILTER(LANG(?kondisiLabel) = "id")
    }
    BIND (SUBSTR(STR(?site), 32) AS ?siteQid) .
  } LIMIT 1`;
}

const ABOUT_SPARQL_QUERY = ``;
