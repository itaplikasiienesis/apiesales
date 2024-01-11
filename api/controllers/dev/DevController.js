
const numeral = require('numeral')
const json2xls = require('json2xls');
const fs = require('fs');
const { log } = require('console');

module.exports = { 
    gettemplate: async function (req, res) {

        //INI Parameter dummy (contoh untuk template yang 'cmotemplate')
        const param = {
            subject : 'CMO Surya Donasin telah rilis',
            distributor : 'Surya Donasin',
            nocmo   : '12345678',
            region  : 'Jabodetabekten',
            bulan   : 'April 2020',
            minggu1 : '2020-10-10',
            minggu2 : '-',
            minggu3 : '2020-10-07',
            minggu4 : '-',
            totalbruto  : 'Rp. 1.450.000.000',
            totaltonase : '1000 Kg',
            status  : 'Waiting ASDH',
        }

        //GET TEMPLATE
        const template = await sails.helpers.generateHtmlEmail.with({ htmltemplate: 'cmotemplate', templateparam: param }); 
        // parameter 'htmltemplate' ada 2 :
        // cmotemplate dan sotemplate

        //KIRIM EMAIL
        // SendEmail("mfachmirizal@gmail.com", param.subject, template); 


        /*
            // UNTUK PARAMETER sotemplate, ini :
            subject
            distributor
            noso
            nocmo
            bulan
            minggu1
            totalminggu1
        */

        //format rupiah
        //import dulu object numeral nya (di atas)
        const hasil = numeral(100000).format('0,0').replace(/,/g, '.');
        console.log(`Rp. ${hasil}`)

        return res.send('Email di kirim')
    },
    objecttostring: async function (req, res) {
        const dataDummy = { CDD: 1, '40 FT': 5 }

        //awal logic
        let hasilParsing = ''                       //Siapkan Wadah untuk hasil
        _.forOwn(dataDummy, function(value, key) {  //Function looping tiap object beserta nilainya
            hasilParsing += `, ${key} = ${value}`   //Build String seperti yg kita inginkan
        });
        hasilParsing = hasilParsing.substr(2)       // Potong 2 karakter awal, karena terdapat ', '
        //END logic

        console.log('hasilParsing', hasilParsing)
        res.send(hasilParsing)
    },
    
    testexcel: async function (req, res) {
        var jsonArr = [{
            foo: 'bar',
            qux: 'moo',
            poo: 123,
            stux: new Date()
        },
        {
            foo: 'bar',
            qux: 'moo',
            poo: 345,
            stux: new Date()
        }]
        
        var hasilXls = json2xls(jsonArr);

        // fs.writeFileSync('data.xlsx', xls, 'binary');
        // res.download(xls)
        res.setHeader('Content-Type', 'application/vnd.openxmlformats');
        res.setHeader("Content-Disposition", "attachment; filename=" + "Nama_File_Excel.xlsx");
        res.end(hasilXls, 'binary');
    },
    testexcel2: async function (req, res) {
        // var jsonArr = [{
        //     foo: 'bar',
        //     qux: 'moo',
        //     poo: 123,
        //     stux: new Date()
        // },
        // {
        //     foo: 'bar',
        //     qux: 'moo',
        //     poo: 345,
        //     stux: new Date()
        // }]
        
        // var hasilXls = json2xls(jsonArr);

        // // fs.writeFileSync('data.xlsx', xls, 'binary');
        // // res.download(xls)
        // res.setHeader('Content-Type', 'application/vnd.openxmlformats');
        // res.setHeader("Content-Disposition", "attachment; filename=" + "Nama_File_Excel.xlsx");
        // res.end(hasilXls, 'binary');


        let data = [
            {
              "kode": "1000057",
              "nama": "MITRA JAYA PERSADA",
              "city": "JAKARTA SELATAN",
              "currency": "IDR",
              "ar_oustanding": 343408790.91,
              "credit_limit": 273845785.27,
              "sisa_saldo": -69563005.64,
              "over_plafond": 1,
              "nilai_so": 58061183.39,
              "details": [
                {
                  "nomor_so": "1300007715",
                  "kode": "1000057",
                  "nama": "MITRA JAYA PERSADA",
                  "city": "JAKARTA SELATAN",
                  "req_delivery_date": "2020-05-06",
                  "currency": "IDR",
                  "nilai_so": 9165042.78,
                  "ar_oustanding": 343408790.91,
                  "credit_limit": 273845785.27,
                  "sisa_saldo": -69563005.64,
                  "nomor_cmo": "add po",
                  "over_plafond": 1,
                  "nomor": 1
                },
                {
                  "nomor_so": "1300007775",
                  "kode": "1000057",
                  "nama": "MITRA JAYA PERSADA",
                  "city": "JAKARTA SELATAN",
                  "req_delivery_date": "2020-06-09",
                  "currency": "IDR",
                  "nilai_so": 4223488.89,
                  "ar_oustanding": 343408790.91,
                  "credit_limit": 273845785.27,
                  "sisa_saldo": -69563005.64,
                  "nomor_cmo": "8317887296",
                  "over_plafond": 1,
                  "nomor": 2
                },
                {
                  "nomor_so": "1300007774",
                  "kode": "1000057",
                  "nama": "MITRA JAYA PERSADA",
                  "city": "JAKARTA SELATAN",
                  "req_delivery_date": "2020-06-09",
                  "currency": "IDR",
                  "nilai_so": 1819851.26,
                  "ar_oustanding": 343408790.91,
                  "credit_limit": 273845785.27,
                  "sisa_saldo": -69563005.64,
                  "nomor_cmo": "3845419248",
                  "over_plafond": 1,
                  "nomor": 3
                },
                {
                  "nomor_so": "1300007773",
                  "kode": "1000057",
                  "nama": "MITRA JAYA PERSADA",
                  "city": "JAKARTA SELATAN",
                  "req_delivery_date": "2020-06-09",
                  "currency": "IDR",
                  "nilai_so": 3086322.3,
                  "ar_oustanding": 343408790.91,
                  "credit_limit": 273845785.27,
                  "sisa_saldo": -69563005.64,
                  "nomor_cmo": "2731886910",
                  "over_plafond": 1,
                  "nomor": 4
                },
                {
                  "nomor_so": "1300007772",
                  "kode": "1000057",
                  "nama": "MITRA JAYA PERSADA",
                  "city": "JAKARTA SELATAN",
                  "req_delivery_date": "2020-06-09",
                  "currency": "IDR",
                  "nilai_so": 9877559.46,
                  "ar_oustanding": 343408790.91,
                  "credit_limit": 273845785.27,
                  "sisa_saldo": -69563005.64,
                  "nomor_cmo": "8239129931",
                  "over_plafond": 1,
                  "nomor": 5
                },
                {
                  "nomor_so": "1300007776",
                  "kode": "1000057",
                  "nama": "MITRA JAYA PERSADA",
                  "city": "JAKARTA SELATAN",
                  "req_delivery_date": "2020-06-16",
                  "currency": "IDR",
                  "nilai_so": 4763571.45,
                  "ar_oustanding": 343408790.91,
                  "credit_limit": 273845785.27,
                  "sisa_saldo": -69563005.64,
                  "nomor_cmo": "8317887296",
                  "over_plafond": 1,
                  "nomor": 6
                },
                {
                  "nomor_so": "1300007778",
                  "kode": "1000057",
                  "nama": "MITRA JAYA PERSADA",
                  "city": "JAKARTA SELATAN",
                  "req_delivery_date": "2020-06-16",
                  "currency": "IDR",
                  "nilai_so": 8876248.76,
                  "ar_oustanding": 343408790.91,
                  "credit_limit": 273845785.27,
                  "sisa_saldo": -69563005.64,
                  "nomor_cmo": "8239129931",
                  "over_plafond": 1,
                  "nomor": 7
                },
                {
                  "nomor_so": "1300007777",
                  "kode": "1000057",
                  "nama": "MITRA JAYA PERSADA",
                  "city": "JAKARTA SELATAN",
                  "req_delivery_date": "2020-06-16",
                  "currency": "IDR",
                  "nilai_so": 4747186.75,
                  "ar_oustanding": 343408790.91,
                  "credit_limit": 273845785.27,
                  "sisa_saldo": -69563005.64,
                  "nomor_cmo": "2306974111",
                  "over_plafond": 1,
                  "nomor": 8
                },
                {
                  "nomor_so": "1300007804",
                  "kode": "1000057",
                  "nama": "MITRA JAYA PERSADA",
                  "city": "JAKARTA SELATAN",
                  "req_delivery_date": "2020-06-23",
                  "currency": "IDR",
                  "nilai_so": 4152519.36,
                  "ar_oustanding": 343408790.91,
                  "credit_limit": 273845785.27,
                  "sisa_saldo": -69563005.64,
                  "nomor_cmo": "8317887296",
                  "over_plafond": 1,
                  "nomor": 9
                },
                {
                  "nomor_so": "1300007802",
                  "kode": "1000057",
                  "nama": "MITRA JAYA PERSADA",
                  "city": "JAKARTA SELATAN",
                  "req_delivery_date": "2020-06-23",
                  "currency": "IDR",
                  "nilai_so": 7349392.38,
                  "ar_oustanding": 343408790.91,
                  "credit_limit": 273845785.27,
                  "sisa_saldo": -69563005.64,
                  "nomor_cmo": "8239129931",
                  "over_plafond": 1,
                  "nomor": 10
                }
              ]
            }
          ]

          let arraydetails = [];
          for (let i = 0; i < data.length; i++) {

              for (let j = 0; j < data[i].details.length; j++) {

                    let obj = {
                        "KODE DISTRIBUTOR": data[i].details[j].kode,
                        "NAMA DISTRIBUTOR": data[i].details[j].nama,
                        "NOMOR SO": data[i].details[j].nomor_so,
                        "KOTA": data[i].details[j].city,
                        "DELIVERY DATE": data[i].details[j].req_delivery_date,
                        "CUURENCY": data[i].details[j].currency,
                        "NILAI SO": Number(data[i].details[j].nilai_so),
                        "AR OUTSTANDING": Number(data[i].details[j].ar_oustanding),
                        "CREDIT LIMIT": Number(data[i].details[j].credit_limit),
                        "SISA SALDO": Number(data[i].details[j].sisa_saldo),
                        "NOMOR CMO": data[i].details[j].nomor_cmo,
                        // "OVER PLAFOND": Number(data[i].details[j].over_plafond),
                        "NOMOR": data[i].details[j].nomor
                    }

                    arraydetails.push(obj);
              }
              
          }


        var hasilXls = json2xls(arraydetails);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats');
        res.setHeader("Content-Disposition", "attachment; filename=" + "Nama_File_Excel.xlsx");
        res.end(hasilXls, 'binary');
          

    }




    
}

