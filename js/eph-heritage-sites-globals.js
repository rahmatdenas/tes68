'use strict';

// 1. JUDUL PETA
const BASE_TITLE = 'WikiSurau';

// ---------------------------------------------------------
// CATATAN PENTING:
// Objek statis `ORGS` dan `DESIGNATION_TYPES` telah dihapus.
// Pengelompokan kini akan dilakukan secara dinamis oleh JavaScript
// saat memproses hasil `provinsiLabel` dari SPARQL_QUERY_0.
// ---------------------------------------------------------

// 2. SPARQL_QUERY_0: Versi Skala Nasional (Dinamis berdasarkan Provinsi)
const SPARQL_QUERY_0 =
`SELECT DISTINCT ?siteQid ?siteLabel ?provinsiQid ?provinsiLabel ?p131LokasiLabel ?tahunBerdiriMentah ?tahunPresisi
WHERE {
  # 1. Subquery untuk jangkar 38 provinsi di Indonesia (Q5098)
  {
    SELECT ?provinsi WHERE {
      ?provinsi wdt:P31 wd:Q5098 .
    }
  }
  
# 2. Daftarkan jenis entitas secara dinamis
  VALUES ?jenis { <PLACEHOLDER_JENIS> }
  
  # 3. Cari entitas yang sesuai dengan jenis di atas, secara transitif di bawah provinsi
  ?site wdt:P31 ?jenis ;
        wdt:P131+ ?provinsi .
  
  # 4. Ambil lokasi persis (Kecamatan/Nagari) secara opsional
  OPTIONAL { ?site wdt:P131 ?p131Lokasi . }
      
  # 5. Ambil data tahun
  OPTIONAL { 
    ?site p:P571 ?inceptionStmt .
    ?inceptionStmt psv:P571 ?inceptionNode .
    ?inceptionNode wikibase:timeValue ?tahunBerdiriMentah ;
                   wikibase:timePrecision ?tahunPresisi .
  }
  
  # 6. Potong URL menjadi ID murni (provinsiQid akan menjadi jangkar indeks)
  BIND(SUBSTR(STR(?site), 32) AS ?siteQid) .
  BIND(SUBSTR(STR(?provinsi), 32) AS ?provinsiQid) .

  # 7. Kunci label hanya dalam bahasa Indonesia
  SERVICE wikibase:label { bd:serviceParam wikibase:language "id". }
}`;

// 3. SPARQL_QUERY_1: Hanya mengambil koordinat P625
const SPARQL_QUERY_1 =
`SELECT ?siteQid ?coord WHERE {
  <SPARQLVALUESCLAUSE>
  ?site p:P625 ?coordStatement .
  ?coordStatement ps:P625 ?coord .
  FILTER NOT EXISTS { ?coordStatement pq:P518 ?x }
  BIND (SUBSTR(STR(?site), 32) AS ?siteQid) .
}`;

// 4. SPARQL_QUERY_3: Mengambil gambar dan link Wikipedia
const SPARQL_QUERY_3 =
`SELECT ?siteQid (SAMPLE(?imgUtama) AS ?image) (SAMPLE(?wikiTitle) AS ?wikipediaUrlTitle) WHERE {
  <SPARQLVALUESCLAUSE>
  
  # 1. AMBIL GAMBAR UTAMA (Murni 100%: Bukan Lingkungan & Bukan Masa Lalu)
  OPTIONAL {
    ?site p:P18 ?imageStatement .
    ?imageStatement ps:P18 ?imgUtama .
    FILTER NOT EXISTS { ?imageStatement pq:P3831 wd:Q16189205 }
    FILTER NOT EXISTS { ?imageStatement pq:P180 wd:Q192630 }
  }
  
  # 2. ARTIKEL WIKIPEDIA
  OPTIONAL {
    ?wikipedia schema:about ?site ;
               schema:isPartOf <https://id.wikipedia.org/> .
    BIND (SUBSTR(STR(?wikipedia), 31) AS ?wikiTitle) .
  }
  
  BIND (SUBSTR(STR(?site), 32) AS ?siteQid) .
} GROUP BY ?siteQid`;

// 5. SPARQL_QUERY_4: Fungsi khusus mengambil Peristiwa Penting untuk satu ID saat diklik
function getSparqlQuery4(qid) {
  return `SELECT ?siteQid ?eventLabel ?pointInTime ?ptPrecision ?startTime ?stPrecision ?endTime ?etPrecision WHERE {
    VALUES ?site { wd:${qid} }
    
    # Ambil node pernyataan peristiwa penting
    ?site p:P793 ?eventStatement .
    
    # Ambil objek peristiwanya
    ?eventStatement ps:P793 ?event .
    
    # Ambil nama peristiwanya dalam bahasa Indonesia
    ?event rdfs:label ?eventLabel . 
    FILTER(LANG(?eventLabel) = "id") .
    
    # Ambil kualifikasi waktu beserta PRESISINYA menggunakan node pqv (bukan sekadar pq)
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

// 6. SPARQL_QUERY_5: Fungsi khusus mengambil arsip gambar untuk satu ID saat diklik
function getSparqlQuery5(qid) {
  return `SELECT ?siteQid ?vicinityImage ?vicinityCaption ?pastImage ?pastCaption WHERE {
    VALUES ?site { wd:${qid} }
    
    # 1. AMBIL GAMBAR LINGKUNGAN SEKITAR & KETERANGAN
    OPTIONAL {
      ?site p:P18 ?vicinityStatement .
      ?vicinityStatement ps:P18 ?vicinityImage .
      FILTER EXISTS { ?vicinityStatement pq:P3831 wd:Q16189205 }
      OPTIONAL {
        ?vicinityStatement pq:P2096 ?vicinityCaption .
        FILTER(LANG(?vicinityCaption) = "id")
      }
    }

    # 2. AMBIL GAMBAR MASA LALU & KETERANGAN
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

// 7. SPARQL_QUERY_6: Fungsi khusus mengambil Kondisi, Kapasitas, dan Kategori Commons (Saat diklik)
function getSparqlQuery6(qid) {
  return `SELECT ?siteQid ?kapasitas ?commonsCat ?kondisiLabel WHERE {
    VALUES ?site { wd:${qid} }
    
    # 1. Kategori Commons (P373)
    OPTIONAL { ?site wdt:P373 ?commonsCat . }
    
    # 2. Kapasitas Maksimal (P1083)
    OPTIONAL { ?site wdt:P1083 ?kapasitas . }
    
    # 3. Kondisi (P5817) - misal: utuh, reruntuhan, dalam bahaya, dll
    OPTIONAL { 
      ?site wdt:P5817 ?kondisiNode . 
      ?kondisiNode rdfs:label ?kondisiLabel .
      FILTER(LANG(?kondisiLabel) = "id")
    }
    
    BIND (SUBSTR(STR(?site), 32) AS ?siteQid) .
  } LIMIT 1`;
}

// 8. ABOUT_SPARQL_QUERY
const ABOUT_SPARQL_QUERY = ``;

// Globals
var DesignationIndex; // Variabel ini tetap saya pertahankan jika sisa JS Anda masih membutuhkannya, namun bisa diganti konsepnya menggunakan ProvinceIndex dari JS1.
var Records = {};
