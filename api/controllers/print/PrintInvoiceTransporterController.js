const Base64 = require('base-64');
const soapRequest = require('easy-soap-request');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const glob = require('glob');
const xml2js = require('xml2js');
const shell = require('shelljs');
const axios = require("axios");
const numeral = require('numeral');
const puppeteer = require('puppeteer');
const handlebars = require("handlebars");
const PDFMerger = require('pdf-merger-js');
const _ = require('lodash');
const { lte } = require('lodash');
const direktoricetak = () => path.resolve(sails.config.appPath, 'assets', 'report', 'invoice');

module.exports = {

    print: async function(req, res) { 
        const {
          query: {m_user_id,delivery_order_id}
        } = req;
    
        var merger = new PDFMerger();
        await DB.poolConnect;
        try {
            
            const request = DB.pool.request();
            let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
            let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
            let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';

            let url = ``;
            let usernamesoap = sails.config.globals.usernamesoap;
            let passwordsoap = sails.config.globals.passwordsoap;
            if(statusIntegasi=='DEV'){

              url = 'http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zws_sales_inv/120/zws_sales_inv/zbn_sales_inv'; // development

                
            }else{
        
              //url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_inv/120/zws_sales_inv/zbn_sales_inv'; // production
              url = 'http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zws_sales_inv/300/zws_sales_inv/zbn_sales_inv'; // development
            }

            
            const tok = `${usernamesoap}:${passwordsoap}`;
            const hash = Base64.encode(tok);
            const Basic = 'Basic ' + hash;


            let sampleHeaders = {
              'Authorization':Basic,
              'user-agent': 'Esales',
              'Content-Type': 'text/xml;charset=UTF-8',
              'soapAction': 'urn:sap-com:document:sap:rfc:functions:ZWS_SALES_INV:ZFM_WS_FORMINVRequest',
            };

            let sqlgetdeliveryorder = `SELECT * FROM delivery_order WHERE delivery_order_id = '${delivery_order_id}'`;
            let datadeliveryorder  = await request.query(sqlgetdeliveryorder);
            let deliveryorder = datadeliveryorder.recordset[0];
            let nomor_do = deliveryorder.nomor_do;
            

            if(!nomor_do){
              return res.error501({
                message: "Document Belum Tersedia Harap Hubungi Divisi IT"
              });

            }else{
              let xml = fs.readFileSync('soap/ZFM_WS_FORMINV.xml', 'utf-8');
              let hasil = await racikXML(xml,nomor_do);
  
              let { response } = await soapRequest({ url: url, headers: sampleHeaders,xml:hasil, timeout: 1000000 }); // Optional timeout parameter(milliseconds)
              let {body, statusCode } = response;
  
              if(statusCode==200){
                var parser = new xml2js.Parser({explicitArray : false});
                parser.parseString(body, async function (err, result) {
                  if (err) {
                    return res.error(err);
                  }
                  
                  const IT_ITEM = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].IT_ITEM;
                  const WA_ADR1 = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_ADR1;
                  const WA_ADR2 = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_ADR2;
                  const WA_ADRC = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_ADRC;
                  const WA_BKPF = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_BKPF;
                  const WA_BSEG = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_BSEG;
                  const WA_HEAD = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_HEAD;
                  const WA_KNA1 = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_KNA1;
                  const WA_KNA2 = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_KNA2;
                  const WA_KNA3 = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_KNA3;
                  const WA_TVZBT = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_TVZBT;
                  const WA_VBAK = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_VBAK;
                  const WA_VBFA = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_VBFA;
                  const WA_VBFA2 = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_VBFA2;
                  const WA_VBPA2 = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_VBPA2;
                  const WA_VBRP = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_FORMINVResponse'].WA_VBRP;
    
                  const MANDT = WA_TVZBT.MANDT;
                  const SPRAS = WA_TVZBT.SPRAS; 
                  const ZTERM = WA_TVZBT.ZTERM;
                  const syarat_pembayaran = WA_TVZBT.VTEXT;
                  const jatuh_tempo = moment(WA_BSEG.NETDT,'YYYY-MM-DD').format('DD.MM.YYYY');
  
  
                  let details = [];
                  let tahun = moment(WA_HEAD.FKDAT,'YYYY-MM-DD').format('YYYY');
                  let bulan = moment(WA_HEAD.FKDAT,'YYYY-MM-DD').format('MM');
                  let nomor_tittle = WA_BKPF.XBLNR;
                  let tanggal_faktur = moment(WA_BKPF.BUDAT,'YYYY-MM-DD').format('YYYY-MM-DD');
                  let no_faktur = WA_BKPF.BKTXT.replace(/\./g,'').replace(/\-/g,'');
                  let alamat_soldto = WA_ADRC.STREET+' '+WA_ADRC.STR_SUPPL1;
                  let alamat_shipto = WA_ADR1.STREET+' '+WA_ADR1.STR_SUPPL1;
                  let npwp = WA_KNA1.STCD1;
                  let nama_pkp = WA_ADRC.NAME1;
                  let jenis_pajak = Number(no_faktur.substring(1,2));
                  let pengganti = Number(no_faktur.substring(1,2));
                  let diskon_tambahan = Number(WA_HEAD.DISC);
                  let diskon_tambahan_bs = Number(WA_HEAD.DISC2);
                  let uang_muka_diterima = Number(WA_HEAD.KWMENG);
                  let dasar_ppn = Number(WA_HEAD.ZRDPP) * 100;
                  let ppn = Number(WA_HEAD.ZRDPP) * 100;
                  let total_akhir = Number(WA_HEAD.TOT) * 100;
                  let terbilang = WA_HEAD.SAY;
                  let kode_pelanggan = Number(WA_HEAD.KUNRG).toString();
                  let nomor_pesanan_pembeli = WA_VBAK.BSTNK;
                  let no_surat_jalan = WA_VBFA2.VBELV;
                  let no_so = WA_VBAK.VBELN;
                  let surat_jalan_dan_so = no_surat_jalan+' / '+no_so;
                  let nama_soldto = WA_KNA3.ANRED+' '+WA_KNA3.MCOD1;
                  let nama_shipto = WA_KNA1.ANRED+' '+WA_KNA1.MCOD1;
  
                  // console.log('nomor_invoice ',nomor_tittle);
                  // console.log('no_faktur ',no_faktur);
                  // console.log('tanggal_faktur ',tanggal_faktur);
                  // console.log('total_akhir ',total_akhir);
                  
                
                  let sqlupdatedeliveryorder = `UPDATE delivery_order SET nomor_faktur='${no_faktur}',
                  nomor_invoice='${nomor_tittle}',tanggal_faktur='${tanggal_faktur}',
                  tanggal_print=getdate(),
                  total_invoice=${total_akhir}
                  WHERE delivery_order_id = '${delivery_order_id}'`;
                  await request.query(sqlupdatedeliveryorder);
  
                  if(IT_ITEM.item[0]){
  
                              let total_penjualan = 0;
                              for (let i = 0; i < IT_ITEM.item.length; i++) {
                                  let element = IT_ITEM.item[i];
  
                                  let hargadiskon =  Number(element.ZDISC) * 100;
                                  let penjualan = Number(element.ZSUM) * 100;
                                  total_penjualan = total_penjualan + penjualan;
                                  
                                  let obj = {
                                      no_unit: i + 1,
                                      kode_produk: element.MATNR,
                                      nama_barang: element.ARKTX,
                                      satuan_pcs: Number(element.UMVKZ),
                                      satuan_crt: Number(element.FKIMG),
                                      harga_crt: numeral(Number(element.KWERT)).format("0,0"),
                                      diskon: numeral(hargadiskon).format("0,0"),
                                      total_penjualan: numeral(penjualan).format("0,0")
                                  }
                                    details.push(obj);
                              }
  
                              let data = {};
  
                              let totalpage = details.length / 15;
  
                              let htmlset = [];
                              for (let i = 0; i < Math.ceil(totalpage); i++) {
                                
                                let offset = i * 15;
                                let limit = (i+1) * 15;
  
                                let html = _generateTable(details.slice(offset,limit),total_penjualan,diskon_tambahan,diskon_tambahan_bs,uang_muka_diterima,dasar_ppn,ppn,total_akhir);
                                data.table = html;
                    
                                data.logoo = 'data:image/png;base64,' + Buffer.from(base64_encode(path.resolve(sails.config.appPath, 'assets', 'report', 'fkr', 'assets', 'log2.png')));
                                data.nama_soldto = nama_soldto;
                                data.nama_shipto = nama_shipto;
                                data.alamat_soldto = alamat_soldto;
                                data.npwp = npwp;
                                data.syarat_pembayaran = syarat_pembayaran;
                                data.jatuh_tempo = jatuh_tempo;
                                data.kode_pelanggan = kode_pelanggan;
                                data.nomor_pesanan_pembeli = nomor_pesanan_pembeli;
                                data.surat_jalan_dan_so = surat_jalan_dan_so;
                                data.nomor_tittle = nomor_tittle;
                                data.alamat_shipto = alamat_shipto;
                                data.terbilang = terbilang;
                    
                                let content = fs.readFileSync(
                                path.resolve(direktoricetak(),"index.hbs"),
                                "utf-8");
                      
                      
                                let template = handlebars.compile(content);
                                let finalHtml = template(data);
  
                                htmlset.push(finalHtml);
                            
  
                              }
  
                              let locationFiles = `./repo/temporary/invoice`;
                              shell.mkdir('-p', locationFiles);
  
                  
                              const browser = await puppeteer.launch({ headless: true })
                              const page = await browser.newPage();
                              
                              for (let i = 0; i < htmlset.length; i++) {
                                
                                    let pageNumber = i + 1;
                                    let finalHtml = htmlset[i];
                                    await page.setContent(finalHtml);
                                    let cssFile=path.join(direktoricetak(),`index.css`);
                                    await page.addStyleTag({path: cssFile});
                                    let file = await page.pdf({ path: `./repo/temporary/invoice/page${pageNumber}.pdf`});
  
                                    merger.add(file)
                                
                              }
  
  
                              await merger.save(`./repo/temporary/invoice/merge.pdf`);
                              await browser.close();
  
                          
                              fs.readFile('./repo/temporary/invoice/merge.pdf', function read(err, data) {
                                if (err) {
                                    throw err;
                                }
                                const content = data;
                                res.contentType(`application/pdf`);
                                res.send(content);
                            });
  
                      }else{
  
                        let element = IT_ITEM.item;

                        if(element.MATNR=='()'){

                          return res.error501({
                            message: "Document Belum Tersedia Harap Hubungi Divisi IT"
                          });
                          
                        }else{
                                let hargadiskon =  Number(element.ZDISC) * 100;
                                let penjualan = Number(element.ZSUM) * 100;
                                let total_penjualan = penjualan;
          
                                let lastMaterial = element.MATNR.substr(element.MATNR.length - 2);
                                let kode_produk = element.MATNR;
          
                                if(lastMaterial==='()'){
          
                                  kode_produk = kode_produk.replace("(","").replace(")","")+`(${kode_produk.replace("(","").replace(")","")})`;
                                }
                                
                                let obj = {
                                    no_unit: 1,
                                    kode_produk: kode_produk,
                                    nama_barang: element.ARKTX,
                                    satuan_pcs: Number(element.UMVKZ),
                                    satuan_crt: Number(element.FKIMG),
                                    harga_crt: numeral(Number(element.KWERT)).format("0,0"),
                                    diskon: numeral(hargadiskon).format("0,0"),
                                    total_penjualan: numeral(penjualan).format("0,0")
                                }
                                details.push(obj);
                                
                                let data = {};
          
                                let htmlset = [];
                                for (let i = 0; i < 1; i++) {
                                  
                                  let offset = i * 15;
                                  let limit = (i+1) * 15;
          
                                  let html = _generateTable(details.slice(offset,limit),total_penjualan,diskon_tambahan,diskon_tambahan_bs,uang_muka_diterima,dasar_ppn,ppn,total_akhir);
                                  data.table = html;
                      
                                  data.logoo = 'data:image/png;base64,' + Buffer.from(base64_encode(path.resolve(sails.config.appPath, 'assets', 'report', 'fkr', 'assets', 'log2.png')));
                                  data.nama_soldto = nama_soldto;
                                  data.nama_shipto = nama_shipto;
                                  data.alamat_soldto = alamat_soldto;
                                  data.npwp = npwp;
                                  data.syarat_pembayaran = syarat_pembayaran;
                                  data.jatuh_tempo = jatuh_tempo;
                                  data.kode_pelanggan = kode_pelanggan;
                                  data.nomor_pesanan_pembeli = nomor_pesanan_pembeli;
                                  data.surat_jalan_dan_so = surat_jalan_dan_so;
                                  data.nomor_tittle = nomor_tittle;
                                  data.alamat_shipto = alamat_shipto;
                                  data.terbilang = terbilang;
                      
                                  let content = fs.readFileSync(
                                  path.resolve(direktoricetak(),"index.hbs"),
                                  "utf-8");
                        
                        
                                  let template = handlebars.compile(content);
                                  let finalHtml = template(data);
          
                                  htmlset.push(finalHtml);
          
          
                                  let locationFiles = `./repo/temporary/invoice`;
                                      shell.mkdir('-p', locationFiles);
          
                          
                                      const browser = await puppeteer.launch({ headless: true })
                                      const page = await browser.newPage();
                                      
                                      for (let i = 0; i < htmlset.length; i++) {
                                        
                                            let pageNumber = i + 1;
                                            let finalHtml = htmlset[i];
                                            await page.setContent(finalHtml);
                                            let cssFile=path.join(direktoricetak(),`index.css`);
                                            await page.addStyleTag({path: cssFile});
                                            let file = await page.pdf({ path: `./repo/temporary/invoice/page${pageNumber}.pdf`});
          
                                            merger.add(file)
                                        
                                      }
          
          
                                      await merger.save(`./repo/temporary/invoice/merge.pdf`);
                                      await browser.close();
          
                                  
                                      fs.readFile('./repo/temporary/invoice/merge.pdf', function read(err, data) {
                                        if (err) {
                                            throw err;
                                        }
                                        console.log(data);
                                        const content = data;
                                        res.contentType(`application/pdf`);
                                        res.send(content);
                                      });
                              
                                }
                    

                            }   
                    
                     }
                              
                });
              
              }else{
              
                return res.error501({
                  message: "Document Belum Tersedia Harap Hubungi Divisi Finance"
                });
              
              }
              
            }
           
        } catch (err) {
          return res.error(err);
        }
    
    }
    
}

function base64_encode(file) {
  var bitmap = fs.readFileSync(file);
  return new Buffer(bitmap).toString('base64');
}


function _generateTable(table,total_penjualan,diskon_tambahan,diskon_tambahan_bs,uang_muka_diterima,dasar_ppn,ppn,total_akhir) {
  if (table.length > 0) {
      const addRowSpan = (column, i, rspan = true, cn = "") => {
          var row = table[i],
              prevRow = table[i - 1],
              td = `<td class="${cn}">${row[column]}</td>`
          if (rspan) {
              if (prevRow && row[column] === prevRow[column]) {
                  td = ``
              } else {
                  var rowspan = 1

                  for (var j = i; j < table.length - 1; j++) {
                      if (table[j][column] === table[j + 1][column]) {
                          rowspan++
                      } else {
                          break
                      }
                  }
                  td = `<td class="${cn}" rowSpan="${rowspan}">${row[column]}</td>`
              }
          }

          return td
      }

      let content = "";
      for (let i = 0; i < table.length; i++) {
          content = content + `<tr>`
          content = content + addRowSpan("no_unit", i, false, "center")
          content = content + addRowSpan("kode_produk", i, false, "left")
          content = content + addRowSpan("nama_barang", i, false, "left")
          content = content + addRowSpan("satuan_pcs", i, false, "right")
          content = content + addRowSpan("satuan_crt", i, false, "right")
          content = content + addRowSpan("harga_crt", i, false, "right")
          content = content + addRowSpan("diskon", i, false, "right")
          content = content + addRowSpan("total_penjualan", i, false, "right")

          content = content + `</tr>`
      }
      let sisa_row = 15 - table.length;

      for (let i = 0; i < sisa_row; i++) {
        content = content + `<tr>`
        content = content + `<td class="left"></td>`
        content = content + `<td class="left"></td>`
        content = content + `<td class="left"></td>`
        content = content + `<td class="left"></td>`
        content = content + `<td class="left"></td>`
        content = content + `<td class="left"></td>`
        content = content + `<td class="left"></td>`
        content = content + `<td class="left"></td>`
        content = content + `</tr>`
        
      }

      
      content = content + `<tr> <th colSpan="7"> Total Nilai Penjualan (Rp) </th> <th colSpan="1">${numeral(total_penjualan).format("0,0")}</th> </tr>`;
      content = content + `<tr> <th colSpan="7"> Diskon Tambahan </th> <th colSpan="1">${numeral(diskon_tambahan).format("0,0")}</th></tr>`;
      content = content + `<tr> <th colSpan="7"> Diskon Tambahan BS </th> <th colSpan="1">${numeral(diskon_tambahan_bs).format("0,0")}</th></tr>`;
      content = content + `<tr> <th colSpan="7"> Dikurangi Uang Muka Yang Telah Diterima </th> <th colSpan="1">${numeral(uang_muka_diterima).format("0,0")}</th></tr>`;
      content = content + `<tr> <th colSpan="7"> Dasar Pengenaan Pajak </th> <th colSpan="1">${numeral(dasar_ppn).format("0,0")}</th></tr>`;
      content = content + `<tr> <th colSpan="7"> PPN 10% </th> <th colSpan="1">${numeral(ppn).format("0,0")}</th></tr>`;
      content = content + `<tr> <th colSpan="7"> Jumlah Akhir/Terbilang </th> <th colSpan="1">${numeral(total_akhir).format("0,0")}</th></tr>`;
    
      

      return content
  }
  
  return '<tr><td>No Data</td></tr>'
}


function racikXML(xmlTemplate, param) {

  return xmlTemplate.replace('?', param);

}