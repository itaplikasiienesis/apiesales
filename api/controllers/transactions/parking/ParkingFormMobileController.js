const Base64 = require('base-64');
const soapRequest = require('easy-soap-request');
const fs = require('fs');
const xml2js = require('xml2js');
const uuid = require("uuid/v4");
const SendEmail = require('../../../services/SendEmail');
const moment = require('moment');
const axios = require("axios");
const { head } = require('lodash');
const { func } = require('joi');
const { Table } = require('mssql');
const path = require('path');
const glob = require("glob");
const json2xls = require('json2xls');
const ClientSFTP = require('ssh2-sftp-client');
var shell = require('shelljs');
const base64ToImage = require('base64-to-image');
const UPC = require('upc-generator');
var _ = require('lodash');
var Canvas = require("canvas");
var Barc = require('barcode-generator'),barc = new Barc();
const { calculateLimitAndOffset, paginate } = require("paginate-info");
const dokumentPath = (param2, param3) => path.resolve(sails.config.appPath, 'api/repo', param2, param3);
const dokumentPath2 = (param2) => path.resolve(sails.config.appPath, 'api/repo',param2);

module.exports = {
    render: async function(req,res){

        const {
            query: {action,tipe,parking_id}
          } = req;
        await DB.poolConnect;
        try {
            const request = DB.pool.request();
            let sglgetAllkey = `SELECT TOP 1 p.*
            FROM parking p,m_kendaraan_transporter mkt 
            WHERE p.m_kendaraan_transporter_id  = mkt.m_kendaraan_transporter_id 
            AND p.parking_id = '${parking_id}' ORDER BY p.created DESC`;
    
            request.query(sglgetAllkey, async (err, result) => {
                if (err) {
                  return res.error(err);
                }

                let row = result.recordset[0];
                let kode_status = row.kode_status;
                let tipeArrayValidation = ['INBOUND','OUTBOUND'];
                var statusCekTipe = (tipeArrayValidation.indexOf(tipe) > -1);

                let actionArrayValidation = ['startunloading','finishunloading','startpickingprocess','startloading','finishloading','documentfinish'];
                var statusCekAction = (actionArrayValidation.indexOf(action) > -1);

                let pesan = ``;
                let listPesan = [];

                if(!statusCekTipe){
                    pesan = `Tipe ${tipe} tidak valid`;
                    listPesan.push(pesan);
                }

                if(!statusCekAction){
                    pesan = `Action ${action} tidak valid`;
                    listPesan.push(pesan);
                }

                if(kode_status=='WT1' && tipe=='OUTBOUND' && action!='startdocument'){
                    pesan = `Status Saat ini Register Outbound ! \nstep selanjutnya seharusnya adalah Start Document`;
                    listPesan.push(pesan);
                }else if(kode_status=='WT2' && tipe=='OUTBOUND' && action!='startpickingprocess'){
                    pesan = `Status Saat ini Start Document ! \nstep selanjutnya seharusnya adalah Start Picking Process`;
                    listPesan.push(pesan);
                }else if(kode_status=='WT5' && tipe=='OUTBOUND' && action!='documentfinish'){
                    pesan = `Status Saat ini Finish Unloading ! \nstep selanjutnya seharusnya adalah Document Finish`;
                    listPesan.push(pesan);
                }else if(kode_status=='WT3' && tipe=='OUTBOUND' && action!='startloading'){
                    pesan = `Status Saat ini Start Picking Process ! \nstep selanjutnya seharusnya adalah Start Loading`;
                    listPesan.push(pesan);
                }else if(kode_status=='WT4' && tipe=='OUTBOUND' && action!='finishloading'){
                    pesan = `Status Saat ini Start Loading ! \nstep selanjutnya seharusnya adalah Finish Loading`;
                    listPesan.push(pesan);
                }else if(kode_status=='WT6' && tipe=='OUTBOUND' && action!='checkout'){
                    pesan = `Status Saat ini Document Finish ! \nstep selanjutnya seharusnya adalah Checkout`;
                    listPesan.push(pesan);
                }else if(kode_status=='WT7' && tipe=='OUTBOUND'){
                    pesan = `Status Saat ini Sudah Checkout ! \nstatus sudah tidak dapat lagi melakukan perubahan`;
                    listPesan.push(pesan);
                }else if(kode_status=='WT1' && tipe=='INBOUND' && action!='startunloading'){
                    pesan = `Status Saat ini Register Inbound ! \nstep selanjutnya seharusnya adalah Start Unloading`;
                    listPesan.push(pesan);
                }else if(kode_status=='WT2' && tipe=='INBOUND' && action!='finishunloading'){
                    pesan = `Status Saat ini Start Unloading ! \nstep selanjutnya seharusnya adalah Finish Unloading`;
                    listPesan.push(pesan);
                }else if(kode_status=='WT3' && tipe=='INBOUND' && action!='documentfinish'){
                    pesan = `Status Saat ini Finish Unloading ! \nstep selanjutnya seharusnya adalah Document Finish`;
                    listPesan.push(pesan);
                }else if(kode_status=='WT4' && tipe=='INBOUND' && action!='checkout'){
                    pesan = `Status Saat ini Document Finish ! \nstep selanjutnya seharusnya adalah Checkout`;
                    listPesan.push(pesan);
                }else if(kode_status=='WT5' && tipe=='INBOUND'){
                    pesan = `Status Saat ini Sudah Checkout ! \nstatus sudah tidak dapat lagi melakukan perubahan`;
                    listPesan.push(pesan);
                }


                

                if(listPesan.length > 0){

                    return res.error({
                        message: listPesan.toString()
                    });

                }else{
                    let dataRow = [];
                    Object.keys(row).forEach(function(key) {
                        var value = row[key];
                        let obj = validationStatusCek(key,value,action,tipe);
                        
                        if(obj){
                            dataRow.push(obj);
                        }                    
                    });
    
                    dataRow = _.orderBy(dataRow, ['index'],['asc']);
                    return res.success({
                        result: dataRow,
                        message: "Berhasil"
                    });
                }


            })

        } catch (error) {
            return res.error(error)
        }
    },

    process: async function(req,res){
        const {action,form} = req.body;
        await DB.poolConnect;

        console.log(req.body);
        try {
            const request = DB.pool.request();
            
            let no_do = ``;
            let bundle = ``;
            let picking = ``;
            let ceker = ``;
            let gate = ``;
            let driver = ``;
            let nomor_gr = ``;
            let kode_status = '';
            let status = '';
            let startdocumentoutbound = '';
            let pickingdateoutbound = '';
            let loading_date = '';
            let loading = '';
            let finish_loading_date = '';
            let start_unloading_date = '';
            let finish_unloading_date = '';
            let documentby = '';

            let data = form.find(e => e.name = 'parking_id');
            let parking_id = data.value;

            let sqlgetTipe = `SELECT * FROM parking WHERE parking_id = '${parking_id}'`;
            let datatipe = await request.query(sqlgetTipe);
            let tipe = datatipe.recordset.length > 0 ? datatipe.recordset[0].tipe : 'INBOUND';
    
            let validasiField = [];
            if(action=='startunloading'){
                let checker = form.find(e => e.name == 'checker');
                let gate_process = form.find(e => e.name == 'gate_process');
                if(!checker){
                    validasiField.push('Field Checker tidak boleh kosong');
                }
                if(!gate_process){
                    validasiField.push('Field Gate Process tidak boleh kosong');
                }

                start_unloading_date = `,start_unloading_date = getdate()`;
                kode_status = 'WT2';
                status = 'Start Unloading';
                ceker = checker ? `,checker = '${checker.value}'`:``;
                gate = gate_process ? `,gate_process = '${gate_process.value}'`:``;
            }


            if(action=='finishunloading'){
                finish_unloading_date = `,finish_unloading_date = getdate()`;
                kode_status = 'WT3';
                status = 'Finish Unloading';
            }


            if(action=='startpickingprocess'){

                let picking_by = form.find(e => e.name == 'picking_by');
                let gate_process = form.find(e => e.name == 'gate_process');

                if(!picking_by){
                    validasiField.push('Field Picking By tidak boleh kosong');
                }
                if(!gate_process){
                    validasiField.push('Field Gate Process tidak boleh kosong');
                }

                picking = picking_by ? `,picking_by = '${picking_by.value}'`:``;
                gate = gate_process ? `,gate_process = '${gate_process.value}'`:``;
                kode_status = 'WT3';
                status = 'Start Picking Proses';
                pickingdateoutbound = `,pickingdateoutbound = getdate()`;
            }

            if(action=='startloading'){

                let loading_by = form.find(e => e.name == 'loading_by');
                if(!loading_by){
                    validasiField.push('Field Loading By tidak boleh kosong');
                }
       
                loading_date = `,loading_date = getdate()`;
                kode_status = 'WT4';
                status = 'Start Loading';
                loading = loading_by ? `,loading_by = '${loading_by.value}'`:``;
            }

            if(action=='finishloading'){
                finish_loading_date = `,finish_loading_date = getdate()`;
                kode_status = 'WT5';
                status = 'Finish Loading';
            }

            if(action=='documentfinish' && tipe=='INBOUND'){
                let document_by = form.find(e => e.name == 'document_by');
                documentby = document_by ? `,document_by = '${document_by.value}'`:``;

                finish_loading_date = `,finish_document_date = getdate()`;
                kode_status = 'WT4';
                status = 'Document Finish';
            }

            if(action=='documentfinish' && tipe=='OUTBOUND'){
                let document_by = form.find(e => e.name == 'document_by');
                documentby = document_by ? `,document_by = '${document_by.value}'`:``;
                finish_loading_date = `,finish_document_date = getdate()`;
                kode_status = 'WT6';
                status = 'Document Finish';
            }


            let queryUpdated = `UPDATE parking SET 
                kode_status = '${kode_status}'
                ,status = '${status}'
                ${gate}${ceker}${bundle}${no_do}${picking}${driver}${nomor_gr}${startdocumentoutbound}${pickingdateoutbound}${documentby}
                ${loading}${loading_date}${finish_loading_date}${start_unloading_date}${finish_unloading_date}
                WHERE parking_id = '${data.value}'`;

            console.log(queryUpdated);
            
            await request.query(queryUpdated);

            if(validasiField.length > 0){
                return res.error({
                    message: validasiField.toString()
                });
            }else{
                await request.query(queryUpdated);
                return res.success({
                    message: "Berhasil"
                });
            }

        } catch (error) {
            console.log(error);
            return res.error(error)
        }
    },
}




function validationStatusCek(param,value,action,tipe){

    var form = ["parking_id","nomor_parkir","reff_no","nopol", "driver", "status","gate_process","checker"];


    if(action=='startunloading' || action=='finishunloading'){
        form = ["parking_id","nomor_parkir","reff_no","nopol", "driver", "status","gate_process","checker"];
    }else if(action=='startpickingprocess'){
        form = ["parking_id","nomor_parkir","reff_no","nopol", "driver", "status","gate_process","bundle_id","nomor_do","picking_by"];
    }else if(action=='startloading'){
        form = ["parking_id","nomor_parkir","reff_no","nopol", "driver", "status","gate_process","bundle_id","nomor_do","loading_by"];
    }else if(action=='finishloading'){
        form = ["parking_id","nomor_parkir","reff_no","nopol", "driver", "status","gate_process","picking_by","loading_by","bundle_id","nomor_do"];
    }else if(action=='documentfinish' && tipe=='INBOUND'){
        form = ["parking_id","nomor_parkir","reff_no","nopol", "driver", "status","gate_process","nomor_gr","document_by"];
    }else if(action=='documentfinish' && tipe=='OUTBOUND'){
        form = ["parking_id","nomor_parkir","reff_no","nopol", "driver", "status","gate_process","nomor_do","document_by"];
    }


    

    var statusCek = (form.indexOf(param) > -1);
    let indexParam = form.indexOf(param);

    if(statusCek){
        let isHide = false;
        let title = aliasField(param);
        let iseditable = isEnableField(param,action,tipe);

        if(param=='parking_id'){
            isHide = true;
        }
        
        let obj = 
        {
      
            name: param,
            title: title,
            iseditable: iseditable,
            isHide : isHide,
            value: value,
            index: indexParam

        }
        return obj;
    }

    return null;

}


function isEnableField(param,action,tipe) {

    let status = false;
    if(action=='startunloading'){
        let fieldEnable = ["gate_process","checker"];
        status = (fieldEnable.indexOf(param) > -1);
    }else if(action=='startpickingprocess'){
        let fieldEnable = ["gate_process","picking_by"];
        status = (fieldEnable.indexOf(param) > -1);
    }else if(action=='startloading'){
        let fieldEnable = ["gate_process","loading_by"];
        status = (fieldEnable.indexOf(param) > -1);
    }else if(action=='documentfinish' && tipe=='INBOUND'){
        let fieldEnable = ["nomor_gr","document_by"];
        status = (fieldEnable.indexOf(param) > -1);
    }else if(action=='documentfinish' && tipe=='OUTBOUND'){
        let fieldEnable = ["nomor_do","document_by"];
        status = (fieldEnable.indexOf(param) > -1);
    }


    return status;
}

function aliasField(param){

    let hasil = param;
    if(param=='nomor_parkir'){
        hasil = 'Kode Parkir';
    }else if(param=='nopol'){
        hasil = 'Nomor Polisi';
    }else if(param=='reff_no'){
        hasil = 'Nomor Surat Jalan';
    }else if(param=='driver'){
        hasil = 'Nama Supir';
    }else if(param=='status'){
        hasil = 'Status';
    }else if(param=='gate_process'){
        hasil = 'Gate Process';
    }else if(param=='checker'){
        hasil = 'Checker';
    }else if(param=='nomor_gr'){
        hasil = 'Nomor GR';
    }else if(param=='nomor_do'){
        hasil = 'Nomor DO';
    }else if(param=='document_by'){
        hasil = 'Document By';
    }else if(param=='bundle_id'){
        hasil = 'Bundle ID';
    }else if(param=='picking_by'){
        hasil = 'Picking By';
    }else if(param=='loading_by'){
        hasil = 'Loading By';
    }



    return hasil;

}



  