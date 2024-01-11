/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */

const fs = require("fs");
const Base64 = require('base-64');
const xml2js = require('xml2js');
const soapRequest = require('easy-soap-request');
  
module.exports = {
 
   // GET RESOURCE
  processData: async function(req, res) {

      const {c_invoice_id,nomor_shipment,eksekusi} = req.body;

      console.log(req.body);
      await DB.poolConnect;
      try {
          const request = DB.pool.request();
          let usernamesoap = sails.config.globals.usernamesoap;
          let passwordsoap = sails.config.globals.passwordsoap;

          let url = `http://sapprdene.enesis.com:8310/sap/bc/srt/rfc/sap/zfm_ws_dopo/300/zws_ws_dopo/zbn_ws_dopo`;

          let sqlgetstatusIntegasi = `SELECT TOP 1 * FROM integration_url ORDER BY created DESC`;
          let datastatusIntegasi = await request.query(sqlgetstatusIntegasi);
          let statusIntegasi = datastatusIntegasi.recordset.length > 0 ? datastatusIntegasi.recordset[0].status : 'DEV';
        
          if(statusIntegasi=='DEV'){
          
              usernamesoap = sails.config.globals.usernamesoapdev;
              passwordsoap = sails.config.globals.passwordsoapdev;

              url = `http://sapdevene.enesis.com:8010/sap/bc/srt/rfc/sap/zfm_ws_dopo/120/zws_sales_dopo/zbn_sales_dopo`;
              
          }


          let sqlGetDataInvoice = `SELECT * FROM bundle_ready_invoice_v driv WHERE nomor_id  = '${nomor_shipment}'`;
          let getDataInvoice = await request.query(sqlGetDataInvoice);
          let dataInvoice = getDataInvoice.recordset.length > 0 ? getDataInvoice.recordset : [];

          let sqlGetDataInvoiceUser = `SELECT * FROM c_invoice WHERE c_invoice_id  = '${c_invoice_id}'`;
          let getDataInvoiceUser = await request.query(sqlGetDataInvoiceUser);
          let m_user_id = getDataInvoiceUser.recordset.length > 0 ? getDataInvoiceUser.recordset[0].createdby : 'SYSTEM';
          let kode_ppn = getDataInvoiceUser.recordset.length > 0 ? getDataInvoiceUser.recordset[0].kode_ppn : 'SYSTEM';

  
          if(dataInvoice.length > 0){
      
            const tok = `${usernamesoap}:${passwordsoap}`;
            const hash = Base64.encode(tok);
            const Basic = 'Basic ' + hash;
  
            let Headers = {
              'Authorization': Basic,
              'user-agent': 'apiesales',
              'Content-Type': 'text/xml;charset=UTF-8',
              'soapAction': 'urn:sap-com:document:sap:rfc:functions:zfm_ws_dopo:ZFM_WS_PODORequest',
            };
  
  


            for (let i = 0; i < dataInvoice.length; i++) {

              let xml = fs.readFileSync('soap/ZFM_WS_PODO.xml', 'utf-8');
              let parser = new xml2js.Parser({ explicitArray: false });
    
              const nomor_id = padGetReady(nomor_shipment);
              let hasil = racikXML(xml, nomor_id);
                              
          
              let { response } = await soapRequest({ url: url, headers: Headers, xml: hasil, timeout: 10000000 }); // Optional timeout parameter(milliseconds)
              let { body, statusCode } = response;

              console.log('statusCode ',statusCode);

              let rincian_biaya = [];
              let obj = {};
              let dataBillingTransporter = [];
              if(statusCode==200){
          
                  
                parser.parseString(body, async function (err, result) {
          
                    console.log(result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse']);
                    const GJAHR = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].GJAHR;
                    const PESAN = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].PESAN;

                    if(GJAHR!='0000' || PESAN==''){

                      //  console.log('PERTAHANKAN ',nomor_id);

                        const EBELN = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].EBELN;
                        const MBLNR = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].MBLNR;
                        const ITEMO = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].ITEMO;
                        const ITEMR = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].ITEMR;
                        const MBLNO = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].MBLNO;
                        const NETWO = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].NETWO;
                        const NETWR = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].NETWR;
                        const ADDCS = result['soap-env:Envelope']['soap-env:Body']['n0:ZFM_WS_PODOResponse'].ADDCS;

                        
                        let totalAdditionalCost = 0;
                        if(ADDCS){
                          // console.log('ADDCS ',ADDCS);
                          const arrayOrNo = Array.isArray(ADDCS.item);
                          // console.log('arrayOrNo ',arrayOrNo);

                            if(arrayOrNo){


                              for (let i = 0; i < ADDCS.item.length; i++) {

                                const namaBiaya = ADDCS.item[i].WGBEZ;
                                const kodeMaterial= ADDCS.item[i].EBELP;
                                const kodeItem = ADDCS.item[i].ITEMO;
                                const nomorGr = ADDCS.item[i].MBLNO;
                                const nominalBiaya = Number(ADDCS.item[i].NETWO) * 100;
                                const fiscalYear = ADDCS.item[i].GJAHO;
                                
                                totalAdditionalCost = totalAdditionalCost + nominalBiaya;

                                rincian_biaya.push({
                                  keterangan : namaBiaya,
                                  nominal : nominalBiaya,
                                  nomor_gr :nomorGr,
                                  kode_item:kodeItem,
                                  kode_material:kodeMaterial,
                                  nomor_id:nomor_id,
                                  fiscal_year:fiscalYear,
                                  nomor_po:EBELN
                                });
                                
                              }

                              
                            }else{


                              const namaBiaya = ADDCS.item.WGBEZ;
                              const kodeMaterial= ADDCS.item.EBELP;
                              const kodeItem = ADDCS.item.ITEMO;
                              const nomorGr = ADDCS.item.MBLNO;
                              const nominalBiaya = Number(ADDCS.item.NETWO) * 100;
                              const fiscalYear = ADDCS.item.GJAHO;

                              totalAdditionalCost = totalAdditionalCost + nominalBiaya;
                      
                              rincian_biaya.push({
                                keterangan : namaBiaya,
                                nominal : nominalBiaya,
                                nomor_gr :nomorGr,
                                kode_item:kodeItem,
                                kode_material:kodeMaterial,
                                nomor_id:nomor_id,
                                fiscal_year:fiscalYear,
                                nomor_po:EBELN
                              });

                            }
                        }

                        
                      dataInvoice[i].tahun = GJAHR;
                      dataInvoice[i].nomor_po = EBELN;
                      dataInvoice[i].nomor_gr = MBLNR;
                      dataInvoice[i].item_additional_cost = ITEMO ? ITEMO : null;
                      dataInvoice[i].item_cost_shipment = ITEMR;
                      dataInvoice[i].nomor_gr_additional_cost = MBLNO;
                      dataInvoice[i].additional_cost = totalAdditionalCost;
                      dataInvoice[i].cost_shipment = Number(NETWR) * 100;
                      dataInvoice[i].total = (Number(NETWR) * 100) + totalAdditionalCost;
                      dataInvoice[i].pesan = null;

                      dataBillingTransporter.push(dataInvoice[i]);

                        obj = {
                            tahun : GJAHR,
                            nomor_po : EBELN,
                            nomor_gr : MBLNR,
                            item_additional_cost : ITEMO,
                            item_cost_shipment : ITEMR,
                            nomor_gr_additional_cost : MBLNO,
                            additional_cost : Number(NETWO) * 100,
                            cost_shipment : Number(NETWR) * 100,
                            pesan : null
                        }


        

                        if(Number(NETWR) * 100 > 0){
                          rincian_biaya.push({
                            keterangan : 'Shipment Cost',
                            nominal : Number(NETWR) * 100,
                            nomor_gr :MBLNR,
                            kode_item:ITEMO,
                            kode_material:ITEMR,
                            nomor_id:nomor_id,
                            fiscal_year:GJAHR,
                            nomor_po:EBELN
                          });
                        }

                        obj.rincian_biaya = rincian_biaya;
                        dataInvoice[i].rincian_biaya = rincian_biaya;
                        
                    }             
                  });         
                  

                  if(dataInvoice.length > 0){

                    console.log(dataInvoice);

                    for (let i = 0; i < dataInvoice.length; i++) {
                          
                      let bundle_id = dataInvoice[i].nomor_id &&  dataInvoice[i].nomor_id != '' ? `'${dataInvoice[i].nomor_id}'` : 'NULL';

                      console.log('bundle_id ',bundle_id);
                      let tahun = dataInvoice[i].tahun &&  dataInvoice[i].tahun != '' ? `${dataInvoice[i].tahun}` : 'NULL';
                      console.log('tahun ',tahun);
                      let nomor_po = dataInvoice[i].nomor_po &&  dataInvoice[i].nomor_po != '' ? `'${dataInvoice[i].nomor_po}'` : 'NULL';
                      let nomor_gr = dataInvoice[i].nomor_gr &&  dataInvoice[i].nomor_gr != '' ? `'${dataInvoice[i].nomor_gr}'` : 'NULL';
                      let item_additional_cost = dataInvoice[i].item_additional_cost &&  dataInvoice[i].item_additional_cost != '' ? `'${dataInvoice[i].item_additional_cost}'` : 'NULL';
                      let item_cost_shipment = dataInvoice[i].item_cost_shipment &&  dataInvoice[i].item_cost_shipment != '' ? `'${dataInvoice[i].item_cost_shipment}'` : 'NULL';
                      let nomor_gr_additional_cost = dataInvoice[i].nomor_gr_additional_cost &&  dataInvoice[i].nomor_gr_additional_cost != '' ? `'${dataInvoice[i].nomor_gr_additional_cost}'` : 'NULL';
                      let cost_shipment = dataInvoice[i].cost_shipment &&  dataInvoice[i].cost_shipment != '' ? dataInvoice[i].cost_shipment : 0;
                      let additional_cost = dataInvoice[i].additional_cost &&  dataInvoice[i].additional_cost != '' ? dataInvoice[i].additional_cost: 0;
                      let delivery_order_id = dataInvoice[i].delivery_order_id &&  dataInvoice[i].delivery_order_id != '' ? `'${dataInvoice[i].delivery_order_id}'` : 'NULL';
                      let tanggal_pod_transporter = dataInvoice[i].tanggal_pod_transporter &&  dataInvoice[i].tanggal_pod_transporter != '' ? `'${dataInvoice[i].tanggal_pod_transporter}'` : 'NULL';
                      let kode_kendaraan = dataInvoice[i].kode_kendaraan &&  dataInvoice[i].kode_kendaraan != '' ? `'${dataInvoice[i].kode_kendaraan}'` : 'NULL';
                      let jenis_kendaraan = dataInvoice[i].jenis_kendaraan &&  dataInvoice[i].jenis_kendaraan != '' ? `'${dataInvoice[i].jenis_kendaraan}'` : 'NULL';
                      let total = dataInvoice[i].total &&  dataInvoice[i].total != '' ? dataInvoice[i].total: 0;


                      let queryInsertLines = `INSERT INTO c_invoice_detail
                      (createdby, updatedby, c_invoice_id, delivery_order_id,bundle_id,tahun,nomor_po,nomor_gr,item_additional_cost,
                      item_cost_shipment,nomor_gr_additional_cost,cost_shipment,additional_cost,tanggal_pod_transporter,nomor_id,kode_kendaraan,jenis_kendaraan,total)
                      VALUES('${m_user_id}','${m_user_id}', '${c_invoice_id}',${delivery_order_id},${bundle_id},${tahun},${nomor_po},${nomor_gr},
                      ${item_additional_cost},${item_cost_shipment},${nomor_gr_additional_cost},${cost_shipment},${additional_cost},
                      ${tanggal_pod_transporter},${bundle_id},${kode_kendaraan},${jenis_kendaraan},${total})`;
                      console.log(queryInsertLines);
                      // await request.query(queryInsertLines);

                      if(eksekusi=='Y'){
                        await request.query(queryInsertLines);
                      }

                      for (let j = 0; j < dataInvoice[i].rincian_biaya.length; j++) {
                        
                        
                        let item = dataInvoice[i].rincian_biaya[j];

                        let dataKodeItem = item.kode_item && item.kode_item!=='undefined' ? `'${item.kode_item}'` : 'NULL';

                        let sqlFakturBiayaLain = `INSERT INTO c_invoice_biaya_lain ( createdby, updatedby,c_invoice_id, keterangan, nominal,nomor_id,
                        nomor_gr,fiscal_year,kode_material,kode_item,nomor_po,kode_detail_ppn) 
                        VALUES ('${m_user_id}','${m_user_id}','${c_invoice_id}','${item.keterangan}','${item.nominal}',
                        '${item.nomor_id}','${item.nomor_gr}','${item.fiscal_year}','${item.kode_material}',${dataKodeItem},'${item.nomor_po}',
                        '${kode_ppn}')`;
                        console.log(sqlFakturBiayaLain);

                        if(eksekusi=='Y'){
                          await request.query(sqlFakturBiayaLain);
                        }
                        
                      }
                      
                      
                  
                    }


                  }
                  
                  return res.success({
                    result: dataInvoice,
                    message: "Fetch data successfully"
                 });
            
              
              }else{

                return res.success({
                  error:true,
                  message: 'Error SOAP'
                });
    
              }

            }        
          }else{

            return res.success({
              error:true,
              message: 'Error SOAP'
            });

          }
              
      } catch (err) {
          return res.error(err);
      }
  },
  
  
};




function racikXML(xmlTemplate, result) {
  return xmlTemplate.replace('?', result)
}

function padGetReady(d) {
    var str = "" + d
    var pad = "0000000000"
    var ans = pad.substring(0, pad.length - str.length) + str
    return ans;
  }



