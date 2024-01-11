const Base64 = require('base-64');
const soapRequest = require('easy-soap-request');
const fs = require('fs');
const xml2js = require('xml2js');
const uuid = require("uuid/v4");
const SendEmail = require('../../services/SendEmail');
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

module.exports = {
    // cotoh funtion method post
    addsoldto: async function (req, res) {
        const { nama, kode, email} = req.body; // --> terima request user
        // console.log(nama,kode,email,kode_pajak,district);

        // return res.error("xxxx")
        await DB.poolConnect; //--> inisialisasi variable DB
        try {
            const request = DB.pool.request(); //--> init var request koneksi

            let qcek = `select * from m_user where username = '${kode}'` //--> initialisasi vr cek
            let data_qcek = await request.query(qcek) // --> execute
            let data = data_qcek.recordset // --> ambil recordset nya aja

            let jml = data.length // jumlah baris di recordset

            if (jml == 0) {
                const sql1 = `exec sp_createNewSoldTo '${nama}','${kode}','${email}'`
                console.log(sql1);
                await request.query(sql1);


                const sql = `select * from m_pajak where kode = '${kode}'`
                let dataklasidikasi = await request.query(sql);
                let resultklasifikasi = dataklasidikasi.recordset;
                // console.log(resultklasifikasi);

                return res.success({
                    data: resultklasifikasi,
                    message: "Berhasil "
                });

            } else {
                return res.error({
                    message: "Data Sudah ada sebelumnya... "
                });
            }

        } catch (err) {
            return res.error(err);
        }
    },
    addshipto: async function (req, res) {
        const { namashipto, kodeshipto, kode_pajak, emailshipto, district, region_id, region_desc, channel, doi} = req.body; // > var yg diminta 
        // console.log('LIAT SINI.......');

        // return res.error("xxxx")
        await DB.poolConnect; //--> inisialisasi variable DB
        try {
            const request = DB.pool.request(); //--> init var request koneksi

            let qcek2 = `select * from m_user where username = '${kodeshipto}'` //--> initialisasi vr cek udh ada blum
            let data_qcek2 = await request.query(qcek2) // --> execute
            let data2 = data_qcek2.recordset // --> ambil recordset nya aja
            // console.log(data);
            // return res.error('sadsdsdas')

            let jml = data2.length // jumlah baris di recordset

            if (jml == 0) {
                const sql1 = `exec sp_createNewShipto '${namashipto}','${kodeshipto}','${kode_pajak}','${emailshipto}','${district}','${region_id}','${region_desc}','${channel}','${doi}'`
                console.log(sql1);
                await request.query(sql1);


                const qwcek = `select * from m_distributor_v where kode = '${kodeshipto}'`
                let dataklasidikasi2 = await request.query(qwcek);
                let resultklasifikasi2 = dataklasidikasi2.recordset;
                // console.log(resultklasifikasi);

                return res.success({
                    data: resultklasifikasi2,
                    message: "Berhasil "
                });
            }else {
                return res.error({
                    message: "data shipto sudah terdaftar sebelumnya.."
                });
            }



        }catch (err) {
            return res.error(err);
        }

    },

    addpatnerbankkey: async function (req, res) {
        const { kode_vendor, bank_country ,bank_key ,bank_account, part_bank_key ,reference_details, account_holder} = req.body; // > var yg diminta 
        // console.log('LIAT SINI PATNER BANK....');

        // return res.error("xxxx")
        await DB.poolConnect; //--> inisialisasi variable DB
        try {
            const request = DB.pool.request(); //--> init var request koneksi

            let qcek2 = `select * from r_partner_bank_key where bank_account = '${bank_account}'` //--> initialisasi vr cek udh ada blum
            let data_qcek2 = await request.query(qcek2) // --> execute
            let data2 = data_qcek2.recordset // --> ambil recordset nya aja
            // console.log(data);
            // return res.error('sadsdsdas')

            let jml = data2.length // jumlah baris di recordset

            if (jml == 0) {

                const qwcek = `select * from m_distributor_v where kode_pajak = '${kode_vendor}'`
                let dataklasidikasi2 = await request.query(qwcek);
                let resultklasifikasi2 = dataklasidikasi2.recordset;
                
                // console.log(resultklasifikasi);

                let jml2 = resultklasifikasi2.length

                if (jml2 == 0) {
                    return res.error({
                        message: "silahkan cek KODE VENDOR anda.."
                    });

                }


                const sql1 = 
                `insert into r_partner_bank_key 
                (kode_vendor ,bank_country ,bank_key ,bank_account, part_bank_key ,reference_details, account_holder)
                values ('${kode_vendor}','${bank_country}','${bank_key}','${bank_account}','${part_bank_key}','${reference_details}','${account_holder}')`
                console.log(sql1);
                await request.query(sql1);


                return res.success({
                    data: resultklasifikasi2,
                    message: "Berhasil "
                });
            }else {
                return res.error({
                    message: "data bank ini sudah terdaftar sebelumnya.."
                });
            }



        }catch (err) {
            console.log(err);
            return res.error(err);
        }

    },

    updatepricelist: async function (req, res) {
        const { ship_to1, kode_sap1, gross,nett} = req.body; // --> terima request user
        // console.log(nama,kode,email,kode_pajak,district);

        // return res.error("xxxx")
        await DB.poolConnect; //--> inisialisasi variable DB
        try {
            const request = DB.pool.request(); //--> init var request koneksi

            let qcek = `select * from m_pricelist_grossnet mpg where kode_shipto = '${ship_to1}' and kode_sap = '${kode_sap1}'` //--> initialisasi vr cek
            console.log(qcek);
            let data_qcek = await request.query(qcek) // --> execute
            let data = data_qcek.recordset // --> ambil recordset nya aja

            let jml = data.length // jumlah baris di recordset

            if (jml > 0) {
                const sql1 = `update m_pricelist_grossnet set gross = ${gross} , nett = ${nett} 
                where kode_sap = '${kode_sap1}' and kode_shipto = '${ship_to1}'`
                console.log(sql1);
                await request.query(sql1);
                


                // const sql = `select * from m_pricelist_grossnet mpg where kode_shipto = '${ship_to}' and kode_sap = ''${kode_sap}'`
                // let dataklasidikasi = await request.query(sql);
                // let resultklasifikasi = dataklasidikasi.recordset;
                // // console.log(resultklasifikasi);

                return res.success({
                    message: "data berhasil di update "
                });

            } else {
                return res.error({
                    message: "data tidak di temukan"
                });
            }

        } catch (err) {
            return res.error(err);
        }
    },

// tambah function disini 
};