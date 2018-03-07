//Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/********************************* LICENSE **********************************
 *                                                                          *
 * This file is part of ApioOS.                                             *
 *                                                                          *
 * ApioOS is free software released under the GPLv2 license: you can        *
 * redistribute it and/or modify it under the terms of the GNU General      *
 * Public License version 2 as published by the Free Software Foundation.   *
 *                                                                          *
 * ApioOS is distributed in the hope that it will be useful, but            *
 * WITHOUT ANY WARRANTY; without even the implied warranty of               *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the             *
 * GNU General Public License version 2 for more details.                   *
 *                                                                          *
 * To read the license either open the file COPYING.txt or                  *
 * visit <http://www.gnu.org/licenses/gpl2.txt>                             *
 *                                                                          *
 ****************************************************************************/

"use strict";
var MongoClient = require("mongodb").MongoClient;
var bodyParser = require("body-parser");
var compression = require("compression");
// var configuration = require("../configuration/default.js");
var configuration = require("../apio.js")().config.return().file;
var database = undefined;
var domain = require("domain");
var express = require("express");
var fs = require("fs");
var app = express();
var http = require("http").Server(app);
var socket_server = require("socket.io")(http);
var xlsx = require("node-xlsx");
//var zip = new require("node-zip")();

var mysql = require("mysql");
var sql_db = mysql.createConnection("mysql://root:root@127.0.0.1/Logs");

var appPath = "public/applications";
var d = domain.create();
var logs = {};
var logsBuffer = {};
var port = 8080;
var dailyBuffer = {};
var everySecondBuffer = {};
var fifteenBuffer = {};
var invalidBoards = {};
var monthlyBuffer = {};
var objectsLogsFiles = {};
var usersLogsFiles = {};

if (process.argv.indexOf("--http-port") > -1) {
    port = Number(process.argv[process.argv.indexOf("--http-port") + 1]);
}

if (configuration.type === "cloud") {
    app.use(function (req, res, next) {
        if ((req.hasOwnProperty("query") && req.query.hasOwnProperty("apioId")) || (req.hasOwnProperty("body") && req.body.hasOwnProperty("apioId"))) {
            appPath = "public/boards/" + (req.query.apioId || req.body.apioId);
        }

        next();
    });
}

// app.use(function (req, res, next) {
//     res.header("Accept", "*");
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Methods", "GET, POST");
//     res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
//     next();
// });

app.use(bodyParser.json({
    limit: "50mb"
}));

app.use(bodyParser.urlencoded({
    extended: true,
    limit: "50mb"
}));

app.use(compression());

process.on("SIGINT", function () {
    console.log("About to exit");
    database.close();
    process.exit();
});

d.on("error", function (err) {
    console.log("Domain error: ", err);
});

socket_server.on("connection", function (socket) {
    socket.on("trigger_invalidation", function (data) {
        if (data.enabled) {
            invalidBoards[data.apioId] = true;
        } else {
            delete invalidBoards[data.apioId];
        }
    });

    socket.on("exec_select_from_cloud", function (data) {
        console.log("Dal cloud mi arriva questo: ", data);
        if (data.query.toLowerCase().indexOf("delete") === -1 && data.query.toLowerCase().indexOf("drop table") === -1) {
            var query = data.query;
            if (data.objectId instanceof Array) {
                for (var x in data.objectId) {
                    query = query.replace(new RegExp("`" + data.objectId[x] + "`", "g"), "`" + data.objectId[x] + "_" + data.apioId + "`");
                }
            } else {
                query = query.replace(new RegExp("`" + data.objectId + "`", "g"), "`" + data.objectId + "_" + data.apioId + "`");
            }

            sql_db.query(query, function (error, result) {
                if (error) {
                    console.log("Errore: ", error)
                    socket_server.emit("send_to_client", {
                        // apioId: data.apioId,
                        // message: "send_to_client",
                        // data: {
                        who: "logic",
                        message: "get_select_data_from_service",
                        data: {
                            to: data.logicName,
                            additional: data.additional,
                            result: "Error"
                        }
                        // }
                    });
                } else if (result) {
                    socket_server.emit("send_to_client", {
                        // who: data.apioId,
                        // message: "send_to_client",
                        // data: {
                        who: "logic",
                        message: "get_select_data_from_service",
                        data: {
                            to: data.logicName,
                            additional: data.additional,
                            result: result
                        }
                        // }
                    });
                } else {
                    socket_server.emit("send_to_client", {
                        // apioId: data.apioId,
                        // message: "send_to_client",
                        // data: {
                        who: "logic",
                        message: "get_select_data_from_service",
                        data: {
                            to: data.logicName,
                            additional: data.additional,
                            result: {}
                        }
                        // }
                    });
                }
            });
        }
    });

    socket.on("exec_select_from_gateway", function (data) {
        console.log("Dal gateway mi arriva questo: ", data);
        if (data.query.toLowerCase().indexOf("delete") === -1 && data.query.toLowerCase().indexOf("drop table") === -1) {
            var query = data.query;
            if (data.objectId instanceof Array) {
                for (var x in data.objectId) {
                    query = query.replace(new RegExp("`" + data.objectId[x] + "`", "g"), "`" + data.objectId[x] + "_" + data.apioId + "`");
                }
            } else {
                query = query.replace(new RegExp("`" + data.objectId + "`", "g"), "`" + data.objectId + "_" + data.apioId + "`");
            }

            sql_db.query(query, function (error, result) {
                if (error) {
                    socket_server.emit("send_to_client_service", {
                        apioId: data.apioId,
                        message: "send_to_client",
                        data: {
                            who: "logic",
                            message: "get_select_data_from_cloud",
                            data: {
                                to: data.logicName,
                                additional: data.additional,
                                result: "Error"
                            }
                        }
                    });
                } else if (result) {
                    socket_server.emit("send_to_client", {
                        who: data.apioId,
                        message: "send_to_client",
                        data: {
                            who: "logic",
                            message: "get_select_data_from_cloud",
                            data: {
                                to: data.logicName,
                                additional: data.additional,
                                result: result
                            }
                        }
                    });
                } else {
                    socket_server.emit("send_to_client_service", {
                        apioId: data.apioId,
                        message: "send_to_client",
                        data: {
                            who: "logic",
                            message: "get_select_data_from_cloud",
                            data: {
                                to: data.logicName,
                                additional: data.additional,
                                result: {}
                            }
                        }
                    });
                }
            });
        }
    });

    socket.on("close", function (data) {
        if (usersLogsFiles.hasOwnProperty(data.user)) {
            delete usersLogsFiles[data.user][data.objectId];

            if (Object.keys(usersLogsFiles[data.user]).length === 0) {
                delete usersLogsFiles[data.user];
            }
        }
    });

    socket.on("log_require", function (data) {
        if (!usersLogsFiles.hasOwnProperty(data.user)) {
            usersLogsFiles[data.user] = {};
        }

        if (!usersLogsFiles[data.user].hasOwnProperty(data.objectId)) {
            usersLogsFiles[data.user][data.objectId] = 0;
        } else {
            usersLogsFiles[data.user][data.objectId] += 50;
        }

        sql_db.query("SELECT * FROM `" + data.objectId + "_" + data.apioId + "` ORDER BY timestamp DESC LIMIT " + usersLogsFiles[data.user][data.objectId] + ", 50", function (error, result) {
            if (error) {
                console.log("Error while getting logs from table " + data.objectId + ": ", error);
            } else {
                var obj = {};
                for (var i in result) {
                    for (var j in result[i]) {
                        if (j !== "id" && j !== "date" && j !== "timestamp") {
                            if (!obj.hasOwnProperty(j)) {
                                obj[j] = {};
                            }

                            obj[j][result[i].timestamp] = result[i][j] === null ? "0" : String(result[i][j]).replace(".", ",");
                        }
                    }
                }

                socket_server.emit("send_to_client", {
                    message: "log_update",
                    data: {
                        log: obj,
                        objectId: data.objectId
                    }
                });

                obj = undefined;
                global.gc();
            }
        });
    });

    socket.on("log_update", function (data) {
        // if (data.query) {
        //     sql_db.query(data.query.replace("`" + data.objectId + "`", "`" + data.objectId + "_" + data.apioId + "`"), function (error, result) {
        //         if (error) {
        //             console.log("Error while inserting logs in table " + data.objectId + ": ", error);
        //         } else if (result) {
        //             console.log("Data in table " + data.objectId + " successfully interted, result: ", result);
        //         } else {
        //             console.log("No result");
        //         }
        //     });
        // }

        if (!invalidBoards[data.apioId] && database && data.apioId) {
            database.collection("Objects").findOne({
                objectId: data.objectId,
                apioId: data.apioId
            }, function (error, object) {
                if (error) {
                    console.log("Error while getting object with objectId " + data.objectId + " and apioId " + data.apioId + ": ", error);
                } else if (object) {
                    sql_db.query("SHOW COLUMNS FROM `" + data.objectId + "_" + data.apioId + "`", function (error, result) {
                        if (error) {
                            console.log("Error while getting columns from table " + data.objectId + "_" + data.apioId + ": ", error);
                        } else if (result) {
                            var timestamp = new Date().getTime(), fields = [], query_string = "", log = {};
                            if (data && data.properties) {
                                delete data.properties.date;

                                for (var x in result) {
                                    if (result[x].Field !== "id" && result[x].Field !== "timestamp") {
                                        fields.push(result[x].Field);
                                    }
                                }

                                for (var i in object.properties) {
                                    if (fields.indexOf(i) > -1) {
                                        if (query_string) {
                                            if (data.properties[i] !== undefined && typeof data.properties[i] !== "object" && data.properties[i] !== null && data.properties[i] !== "") {
                                                query_string += ", `" + i + "` = '" + String(data.properties[i]).replace(",", ".") + "'";
                                                if (!log.hasOwnProperty(i)) {
                                                    log[i] = {};
                                                }

                                                log[i][timestamp] = String(data.properties[i]).replace(",", ".");
                                            } else if (object.properties[i].value !== undefined && typeof object.properties[i].value !== "object" && object.properties[i].value !== null && object.properties[i].value !== "") {
                                                query_string += ", `" + i + "` = '" + String(object.properties[i].value).replace(",", ".") + "'";
                                                if (!log.hasOwnProperty(i)) {
                                                    log[i] = {};
                                                }

                                                log[i][timestamp] = String(object.properties[i].value).replace(",", ".");
                                            }
                                        } else {
                                            query_string = "INSERT INTO `" + data.objectId + "_" + data.apioId + "` SET `timestamp` = '" + timestamp + "'";
                                            if (data.properties[i] !== undefined && typeof data.properties[i] !== "object" && data.properties[i] !== null && data.properties[i] !== "") {
                                                query_string += ", `" + i + "` = '" + String(data.properties[i]).replace(",", ".") + "'";
                                                if (!log.hasOwnProperty(i)) {
                                                    log[i] = {};
                                                }

                                                log[i][timestamp] = String(data.properties[i]).replace(",", ".");
                                            } else if (object.properties[i].value !== undefined && typeof object.properties[i].value !== "object" && object.properties[i].value !== null && object.properties[i].value !== "") {
                                                query_string += ", `" + i + "` = '" + String(object.properties[i].value).replace(",", ".") + "'";
                                                if (!log.hasOwnProperty(i)) {
                                                    log[i] = {};
                                                }

                                                log[i][timestamp] = String(object.properties[i].value).replace(",", ".");
                                            }
                                        }
                                    }
                                }

                                sql_db.query(query_string, function (error, result) {
                                    if (error) {
                                        console.log("Error while inserting logs in table " + data.objectId + "_" + data.apioId + ": ", error);
                                    } else if (result) {
                                        console.log("Data in table " + data.objectId + "_" + data.apioId + " successfully interted, result: ", result);
                                    } else {
                                        console.log("No result");
                                    }
                                });
                            }
                        }
                    });
                }
            });
        }
    });

    // socket.on("log_update", function (dataArray) {
    //     // if (data.query) {
    //     //     sql_db.query(data.query.replace("`" + data.objectId + "`", "`" + data.objectId + "_" + data.apioId + "`"), function (error, result) {
    //     //         if (error) {
    //     //             console.log("Error while inserting logs in table " + data.objectId + ": ", error);
    //     //         } else if (result) {
    //     //             console.log("Data in table " + data.objectId + " successfully interted, result: ", result);
    //     //         } else {
    //     //             console.log("No result");
    //     //         }
    //     //     });
    //     // }
    //
    //     if (database && dataArray && dataArray instanceof Array) {
    //         dataArray.forEach(function (data) {
    //             console.log("data: ", data);
    //             if (data.apioId) {
    //                 database.collection("Objects").findOne({
    //                     objectId: data.objectId,
    //                     apioId: data.apioId
    //                 }, function (error, object) {
    //                     if (error) {
    //                         console.log("Error while getting object with objectId " + data.objectId + " and apioId " + data.apioId + ": ", error);
    //                     } else if (object) {
    //                         sql_db.query("SHOW COLUMNS FROM `" + data.objectId + "_" + data.apioId + "`", function (error, result) {
    //                             if (error) {
    //                                 console.log("Error while getting columns from table " + data.objectId + "_" + data.apioId + ": ", error);
    //                             } else if (result) {
    //                                 var timestamp = new Date().getTime(), fields = [], query_string = "", log = {};
    //                                 delete data.properties.date;
    //
    //                                 for (var x in result) {
    //                                     if (result[x].Field !== "id" && result[x].Field !== "timestamp") {
    //                                         fields.push(result[x].Field);
    //                                     }
    //                                 }
    //
    //                                 for (var i in object.properties) {
    //                                     if (fields.indexOf(i) > -1) {
    //                                         if (query_string) {
    //                                             if (data.properties[i] !== undefined && typeof data.properties[i] !== "object" && data.properties[i] !== null && data.properties[i] !== "" && !isNaN(String(data.properties[i]).replace(",", "."))) {
    //                                                 query_string += ", `" + i + "` = '" + String(data.properties[i]).replace(",", ".") + "'";
    //                                                 if (!log.hasOwnProperty(i)) {
    //                                                     log[i] = {};
    //                                                 }
    //
    //                                                 log[i][timestamp] = String(data.properties[i]).replace(",", ".");
    //                                             } else if (object.properties[i].value !== undefined && typeof object.properties[i].value !== "object" && object.properties[i].value !== null && object.properties[i].value !== "" && !isNaN(String(object.properties[i].value).replace(",", "."))) {
    //                                                 query_string += ", `" + i + "` = '" + String(object.properties[i].value).replace(",", ".") + "'";
    //                                                 if (!log.hasOwnProperty(i)) {
    //                                                     log[i] = {};
    //                                                 }
    //
    //                                                 log[i][timestamp] = String(object.properties[i].value).replace(",", ".");
    //                                             }
    //                                         } else {
    //                                             query_string = "INSERT INTO `" + data.objectId + "_" + data.apioId + "` SET `timestamp` = '" + timestamp + "'";
    //                                             if (data.properties[i] !== undefined && typeof data.properties[i] !== "object" && data.properties[i] !== null && data.properties[i] !== "" && !isNaN(String(data.properties[i]).replace(",", "."))) {
    //                                                 query_string += ", `" + i + "` = '" + String(data.properties[i]).replace(",", ".") + "'";
    //                                                 if (!log.hasOwnProperty(i)) {
    //                                                     log[i] = {};
    //                                                 }
    //
    //                                                 log[i][timestamp] = String(data.properties[i]).replace(",", ".");
    //                                             } else if (object.properties[i].value !== undefined && typeof object.properties[i].value !== "object" && object.properties[i].value !== null && object.properties[i].value !== "" && !isNaN(String(object.properties[i].value).replace(",", "."))) {
    //                                                 query_string += ", `" + i + "` = '" + String(object.properties[i].value).replace(",", ".") + "'";
    //                                                 if (!log.hasOwnProperty(i)) {
    //                                                     log[i] = {};
    //                                                 }
    //
    //                                                 log[i][timestamp] = String(object.properties[i].value).replace(",", ".");
    //                                             }
    //                                         }
    //                                     }
    //                                 }
    //
    //                                 sql_db.query(query_string, function (error, result) {
    //                                     if (error) {
    //                                         console.log("Error while inserting logs in table " + data.objectId + "_" + data.apioId + ": ", error);
    //                                     } else if (result) {
    //                                         console.log("Data in table " + data.objectId + "_" + data.apioId + " successfully interted, result: ", result);
    //                                     } else {
    //                                         console.log("No result");
    //                                     }
    //                                 });
    //                             }
    //                         });
    //                     }
    //                 });
    //             }
    //         });
    //     }
    // });
});

sql_db.connect(function (err) {
    if (err) {
        console.error("Error while connecting to MySQL: ", err);
    } else {
        console.log("Successfully connected to MySQL, connection id: " + sql_db.threadId);
    }
});

MongoClient.connect("mongodb://" + configuration.database.hostname + ":" + configuration.database.port + "/" + configuration.database.database, function (error, db) {
    if (error) {
        console.log("Unable to get database");
    } else if (db) {
        database = db;
        console.log("Database correctly initialized");
    }
});

http.listen(port, "localhost", function () {
// http.listen(port, function () {
    console.log("APIO Log Service correctly started on port " + port);
});

var parseDate = function (d, addSeconds, addDate) {
    var date = new Date(Number(d));
    var date_ = "";
    if (addDate === true) {
        date_ += (date.getDate() < 10 ? "0" + date.getDate() : date.getDate()) + "-" + ((date.getMonth() + 1) < 10 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1)) + "-" + date.getFullYear() + " ; ";
    }
    date_ += (date.getHours() < 10 ? "0" + date.getHours() : date.getHours()) + ":" + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes());
    if (addSeconds === true) {
        date_ += ":" + (date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds());
    }
    return date_;
};

app.get("/apio/log/getAllByObjectId/:objectId/properties/:properties", function (req, res) {
    var properties = req.params.properties.split(",");
    database.collection("Objects").findOne({
        apioId: req.query.apioId,
        objectId: req.params.objectId
    }, function (err, object) {
        if (err) {
            res.sendStatus(500);
        } else if (object) {
            database.collection("Services").findOne({apioId: req.query.apioId, name: "log"}, function (err1, service) {
                // var limit = 50;
                if (err1) {
                    console.log("Error while getting service log: ", err1);
                } else if (service) {
                    // limit = Number(service.exportLimit.xlsx);
                }

                // sql_db.query("SELECT * FROM `" + req.params.objectId + "_" + req.query.apioId + "` ORDER BY timestamp DESC LIMIT 0, " + (limit * limit), function (error, result) {
                sql_db.query("SELECT * FROM `" + req.params.objectId + "_" + req.query.apioId + "` ORDER BY timestamp", function (error, result) {
                    if (error) {
                        console.log("Error while getting logs from table " + req.params.objectId + "_" + req.query.apioId + ": ", error);
                    } else {
                        // var obj = {};

                        result.sort(function (a, b) {
                            return Number(a.timestamp) - Number(b.timestamp);
                        });

                        // if (result.length <= 2500) {
                        //     for (var i in result) {
                        //         var keys = Object.keys(result[i]);
                        //         for (var j in keys) {
                        //             if (keys[j] !== "timestamp" && properties.indexOf(keys[j]) === -1) {
                        //                 delete result[i][keys[j]];
                        //             }
                        //         }
                        //     }
                        //
                        //     for (var i in result) {
                        //         for (var j in result[i]) {
                        //             if (j !== "id" && j !== "date" && j !== "timestamp") {
                        //                 if (!obj.hasOwnProperty(j)) {
                        //                     obj[j] = {};
                        //                 }
                        //
                        //                 // obj[j][result[i].timestamp] = result[i][j] === null ? "0" : String(result[i][j]).replace(".", ",");
                        //                 obj[j][result[i].timestamp] = result[i][j] === null ? "-" : String(result[i][j]).replace(".", ",");
                        //             }
                        //         }
                        //     }
                        //
                        //     res.status(200).send(obj);
                        //     obj = undefined;
                        //     global.gc();
                        // } else {
                        var D = new Date(Number(result[0].timestamp));
                        var daysNumber = Math.ceil((Number(result[result.length - 1].timestamp) - Number(result[0].timestamp)) / 1000 / 60 / 60 / 24) + 1;
                        var tsArray = [];
                        var now = new Date();
                        for (var i = 0; i <= 1440 * daysNumber; i += 15) {
                            var dateToPush = new Date(D.getFullYear(), D.getMonth(), D.getDate(), 0, i).getTime();
                            if (dateToPush <= now) {
                                tsArray.push(dateToPush);
                            }
                        }

                        var final = "", obj = {};
                        var processRow = function (row) {
                            for (var j in row) {
                                if (j !== "timestamp") {
                                    if (!obj.hasOwnProperty(j)) {
                                        obj[j] = {};
                                    }

                                    // obj[j][row.timestamp] = row[j] === null ? "0" : String(row[j]).replace(".", ",");
                                    obj[j][row.timestamp] = row[j] === null ? "-" : String(row[j]).replace(".", ",");
                                }
                            }
                        };

                        for (var i = 0; i < tsArray.length - 1; i++) {
                            var query = "SELECT ";
                            for (var j in properties) {
                                if (query === "SELECT ") {
                                    query += "AVG(`" + properties[j] + "`) AS `" + properties[j] + "`";
                                } else {
                                    query += ", AVG(`" + properties[j] + "`) AS `" + properties[j] + "`";
                                }
                            }

                            query += ", " + tsArray[i] + " AS timestamp FROM `" + req.params.objectId + "_" + req.query.apioId + "` WHERE (timestamp >= " + tsArray[i] + " AND timestamp < " + tsArray[i + 1] + ")";

                            if (final) {
                                final += " UNION " + query;
                            } else {
                                final = query;
                            }
                        }

                        final = "SELECT * FROM (" + final + ") AS T";

                        sql_db.query(final).on("result", function (row) {
                            processRow(row);
                        }).on("end", function () {
                            res.status(200).send(obj);
                            obj = undefined;
                            global.gc();
                        });
                        // }
                    }
                });
            });
        }
    });
});

app.get("/apio/log/exportXLSX", function (req, res) {
    var propertyToInclude = req.query.properties.split(",");
    database.collection("Objects").findOne({
        apioId: req.query.apioId,
        objectId: req.query.objectId
    }, function (err, object) {
        if (err) {
            res.status(500).send(err);
        } else if (object) {
            var isIn = function (timestamp) {
                for (var i in json) {
                    if (typeof json[i][0] !== "string" && json[i][0].getTime() === timestamp) {
                        return i;
                    }
                }

                return -1;
            };

            var json = [["Data"]];
            for (var i = 0; i < propertyToInclude.length; i++) {
                if (object.properties.hasOwnProperty(propertyToInclude[i])) {
                    if (object.properties[propertyToInclude[i]].hasOwnProperty("label")) {
                        json[0].push(object.properties[propertyToInclude[i]].label);
                    } else {
                        json[0].push(object.properties[propertyToInclude[i]].labelon + "/" + object.properties[propertyToInclude[i]].labeloff);
                    }
                } else {
                    json[0].push(propertyToInclude[i]);
                }
            }

            sql_db.query("SELECT * FROM `" + req.query.objectId + "_" + req.query.apioId + "` ORDER BY timestamp DESC LIMIT 0, " + (50 * 250), function (error, result) {
                if (error) {
                    console.log("Error while getting logs from table " + req.query.objectId + "_" + req.query.apioId + ": ", error);
                } else {
                    var obj = {};
                    for (var i in result) {
                        for (var j in result[i]) {
                            if (j !== "id" && j !== "date" && j !== "timestamp") {
                                if (!obj.hasOwnProperty(j)) {
                                    obj[j] = {};
                                }

                                obj[j][result[i].timestamp] = result[i][j] === null ? "0" : String(result[i][j]).replace(".", ",");
                            }
                        }
                    }

                    for (var i = 0; i < propertyToInclude.length; i++) {
                        for (var j in obj[propertyToInclude[i]]) {
                            var index = isIn(Number(j));
                            if (index > -1) {
                                json[index][i + 1] = Number(obj[propertyToInclude[i]][j].replace(",", "."));
                            } else {
                                var arr = [new Date(Number(j))];
                                arr[i + 1] = Number(obj[propertyToInclude[i]][j].replace(",", "."));
                                json.push(arr);
                                arr = undefined;
                            }
                        }
                    }

                    json.sort(function (a, b) {
                        if (typeof a[0] === "object" && typeof b[0] === "string") {
                            return 1;
                        } else if (typeof a[0] === "string" && typeof b[0] === "object") {
                            return -1
                        } else {
                            return b[0].getTime() - a[0].getTime();
                        }
                    });

                    fs.writeFile("../" + appPath + "/" + req.query.objectId + "/Report " + object.name + ".xlsx", xlsx.build([{
                        name: "Foglio 1",
                        data: json
                    }]), function (err) {
                        if (err) {
                            res.status(500).send(err);
                        } else {
                            obj = undefined;
                            global.gc();
                            res.status(200).send("applications/" + req.query.objectId + "/Report " + object.name + ".xlsx");
                        }
                    });
                }
            });
        } else {
            res.status(404).send("No objects found");
        }
    });
});

app.get("/apio/log/getByDate/objectId/:objectId/date/:date", function (req, res) {
    var dateArr = req.params.date.split("-");
    var todayTimestamp = new Date(Number(dateArr[0]), Number(dateArr[1]) - 1, Number(dateArr[2])).getTime();
    var tomorrowTimestamp = new Date(Number(dateArr[0]), Number(dateArr[1]) - 1, Number(dateArr[2]) + 1).getTime();

    var obj = {};
    var processRow = function (row) {
        for (var j in row) {
            if (j !== "id" && j !== "date" && j !== "timestamp") {
                if (!obj.hasOwnProperty(j)) {
                    obj[j] = {};
                }

                obj[j][row.timestamp] = row[j] === null ? "0" : String(row[j]).replace(".", ",");
            }
        }
    };

    req.pause();
    sql_db.query("SELECT * FROM `" + req.params.objectId + "_" + req.query.apioId + "` WHERE (timestamp >= '" + todayTimestamp + "' AND timestamp < '" + tomorrowTimestamp + "') ORDER BY timestamp DESC").on("error", function () {
        res.status(200).send({});
    }).on("result", function (row) {
        processRow(row);
    }).on("end", function () {
        req.resume();
        res.status(200).send(obj);
        obj = undefined;
        global.gc();
    });
});

app.get("/apio/log/getByRange/objectId/:objectId/from/:from/daysNumber/:daysNumber", function (req, res) {
    var fromComponents = req.params.from.split("-"), obj = {};
    var startTimestamp = new Date(Number(fromComponents[0]), Number(fromComponents[1]) - 1, Number(fromComponents[2])).getTime();
    var endTimestamp = new Date(Number(fromComponents[0]), Number(fromComponents[1]) - 1, Number(fromComponents[2]) + Number(req.params.daysNumber) + 1).getTime();

    var processRow = function (row) {
        for (var j in row) {
            if (j !== "id" && j !== "date" && j !== "timestamp") {
                if (!obj.hasOwnProperty(j)) {
                    obj[j] = {};
                }

                obj[j][row.timestamp] = row[j] === null ? "0" : String(row[j]).replace(".", ",");
            }
        }
    };

    req.pause();
    sql_db.query("SELECT * FROM `" + req.params.objectId + "_" + req.query.apioId + "` WHERE (timestamp >= '" + startTimestamp + "' AND timestamp < '" + endTimestamp + "') ORDER BY timestamp DESC").on("error", function () {
        res.status(200).send({});
    }).on("result", function (row) {
        processRow(row);
    }).on("end", function () {
        req.resume();
        res.status(200).send(obj);
        obj = undefined;
        global.gc();
    });
});

app.get("/apio/log/getSumFileByDate/objectId/:objectId/date/:date", function (req, res) {
    var dateComponents = req.params.date.split("-"), tsArray = [];
    for (var i = 0; i <= 1440; i += 15) {
        tsArray.push(new Date(Number(dateComponents[0]), Number(dateComponents[1]) - 1, Number(dateComponents[2]), 0, i).getTime());
    }

    database.collection("Objects").findOne({
        apioId: req.query.apioId,
        objectId: req.params.objectId
    }, function (err, object) {
        if (err) {
            res.status(200).send({});
        } else if (object) {
            var final = "", obj = {};
            var processRow = function (row) {
                for (var j in row) {
                    if (j !== "timestamp") {
                        if (!obj.hasOwnProperty(j)) {
                            obj[j] = {};
                        }

                        //obj[j][row.timestamp] = row[j] === null ? "0" : String(row[j]).replace(".", ",");
                        if (row[j] != null && j.indexOf("count") == -1) {
                            obj[j][row.timestamp] = String(row[j]).replace(".", ",");
                        } else if (row[j] != null && j.indexOf("count") == 0 && String(row[j]) != "0") {
                            obj[j][row.timestamp] = String(row[j]);
                        }
                    }
                }
            };

            for (var i = 0; i < tsArray.length - 1; i++) {
                var query = "SELECT ";
                for (var j in object.properties) {
                    if (object.properties[j].type != "log") {
                        if (query === "SELECT ") {
                            query += "SUM(`" + j + "`) AS `" + j + "`, COUNT(`" + j + "`) AS `count" + j + "`";
                        } else {
                            query += ", SUM(`" + j + "`) AS `" + j + "`, COUNT(`" + j + "`) AS `count" + j + "`";
                        }
                    }
                }

                query += ", " + tsArray[i] + " AS timestamp FROM `" + req.params.objectId + "_" + req.query.apioId + "` WHERE (timestamp >= " + tsArray[i] + " AND timestamp < " + tsArray[i + 1] + ")";

                if (final) {
                    final += " UNION " + query;
                } else {
                    final = query;
                }
            }

            final = "SELECT * FROM (" + final + ") AS T";

            sql_db.query(final).on("result", function (row) {
                processRow(row);
            }).on("end", function () {
                res.status(200).send(obj);
                obj = undefined;
                global.gc();
            });
        } else {
            res.status(200).send({});
        }
    });
});

app.get("/apio/log/getSumFileByRange/objectId/:objectId/from/:from/daysNumber/:daysNumber", function (req, res) {
    var dateComponents = req.params.from.split("-"), tsArray = [];
    for (var i = 0; i <= 1440 * (Number(req.params.daysNumber) + 1); i += 15) {
        tsArray.push(new Date(Number(dateComponents[0]), Number(dateComponents[1]) - 1, Number(dateComponents[2]), 0, i).getTime());
    }

    database.collection("Objects").findOne({
        apioId: req.query.apioId,
        objectId: req.params.objectId
    }, function (err, object) {
        if (err) {
            res.status(200).send({});
        } else if (object) {
            var final = "", obj = {};
            var processRow = function (row) {
                for (var j in row) {
                    if (j !== "timestamp") {
                        if (!obj.hasOwnProperty(j)) {
                            obj[j] = {};
                        }

                        obj[j][row.timestamp] = row[j] === null ? "0" : String(row[j]).replace(".", ",");
                    }
                }
            };

            for (var i = 0; i < tsArray.length - 1; i++) {
                var query = "SELECT ";
                for (var j in object.properties) {
                    if (object.properties[j].type != "log") {
                        if (query === "SELECT ") {
                            query += "SUM(`" + j + "`) AS `" + j + "`, COUNT(`" + j + "`) AS `count" + j + "`";
                        } else {
                            query += ", SUM(`" + j + "`) AS `" + j + "`, COUNT(`" + j + "`) AS `count" + j + "`";
                        }
                    }
                }

                query += ", " + tsArray[i] + " AS timestamp FROM `" + req.params.objectId + "_" + req.query.apioId + "` WHERE (timestamp >= " + tsArray[i] + " AND timestamp < " + tsArray[i + 1] + ")";

                if (final) {
                    final += " UNION " + query;
                } else {
                    final = query;
                }
            }

            final = "SELECT * FROM (" + final + ") AS T";

            sql_db.query(final).on("result", function (row) {
                processRow(row);
            }).on("end", function () {
                res.status(200).send(obj);
                obj = undefined;
                global.gc();
            });
        } else {
            res.status(200).send({});
        }
    });
});

app.get("/apio/log/getSumFileByRange/objectId/:objectId/from/:from/daysNumber/:daysNumber/properties/:properties/type/:type/timing/:timing", function (req, res) {
    var dateComponents = req.params.from.split("-"), tsArray = [];
    var timing = Number(req.params.timing);
    var type = req.params.type;
    for (var i = 0; i <= 1440 * (Number(req.params.daysNumber) + 1); i += timing) {
        tsArray.push(new Date(Number(dateComponents[0]), Number(dateComponents[1]) - 1, Number(dateComponents[2]), 0, i).getTime());
    }
    if (tsArray.indexOf(new Date(Number(dateComponents[0]), Number(dateComponents[1]) - 1, Number(dateComponents[2]), 0, 1440 * (Number(req.params.daysNumber) + 1)).getTime()) == -1) {
        tsArray.push(new Date(Number(dateComponents[0]), Number(dateComponents[1]) - 1, Number(dateComponents[2]), 0, 1440 * (Number(req.params.daysNumber) + 1)).getTime());
    }

    var properties = JSON.parse(req.params.properties);
    console.log("properties: ", properties);
    database.collection("Objects").findOne({
        apioId: req.query.apioId,
        objectId: req.params.objectId
    }, function (err, object) {
        if (err) {
            res.status(200).send({});
        } else if (object) {
            var final = "", obj = {};
            // var processRow = function (row) {
            //     for (var j in row) {
            //         if (j !== "timestamp") {
            //             if (!obj.hasOwnProperty(j)) {
            //                 obj[j] = {};
            //             }
            //
            //             obj[j][row.timestamp] = row[j] === null ? "0" : String(row[j]).replace(".", ",");
            //         }
            //     }
            // };
            var processRow = function (row) {
                for (var j in row) {
                    if (j !== "timestamp") {
                        if (!obj.hasOwnProperty(j)) {
                            obj[j] = {};
                        }

                        //obj[j][row.timestamp] = row[j] === null ? "0" : String(row[j]).replace(".", ",");
                        if (row[j] != null && j.indexOf("count") == -1) {
                            obj[j][row.timestamp] = String(row[j]).replace(".", ",");
                        } else if (row[j] != null && j.indexOf("count") == 0 && String(row[j]) != "0") {
                            obj[j][row.timestamp] = String(row[j]);
                        }
                    }
                }
            };

            for (var i = 0; i < tsArray.length - 1; i++) {
                var query = "SELECT ";
                for (var j in properties) {
                    if (properties[j] != "log") {
                        if (query === "SELECT ") {
                            query += "SUM(`" + properties[j] + "`) AS `" + properties[j] + "`, COUNT(`" + properties[j] + "`) AS `count" + properties[j] + "`";
                        } else {
                            query += ", SUM(`" + properties[j] + "`) AS `" + properties[j] + "`, COUNT(`" + properties[j] + "`) AS `count" + properties[j] + "`";
                        }
                    }
                }

                query += ", " + tsArray[i] + " AS timestamp FROM `" + req.params.objectId + "_" + req.query.apioId + "` WHERE (timestamp >= " + tsArray[i] + " AND timestamp < " + tsArray[i + 1] + ")";

                if (final) {
                    final += " UNION " + query;
                } else {
                    final = query;
                }
            }

            final = "SELECT * FROM (" + final + ") AS T";
            sql_db.query(final).on("result", function (row) {
                processRow(row);
            }).on("end", function () {
                var correzzioni = {
                    valoreMaxPicco: 10000
                };

                ///esclude picchi
                for (var i in obj) {
                    if (i.indexOf("count") != 0) {
                        var keys = Object.keys(obj[i]);
                        for (var j = 0; j < keys.length; j++) {
                            if (j > 0) {
                                // console.log("1",Math.abs(Number(obj[i][keys[j]])),"2",100* Math.abs(Number(obj[i][keys[j == keys.length -1 ?j-1:j+1]])+1))
                                console.log('Number(obj[i][keys[j]].replace(",", ".")) != 0', Number(obj[i][keys[j]].replace(",", ".")));
                                if (Number(obj[i][keys[j]].replace(",", ".")) != 0 && Number(obj[i][keys[j - 1]].replace(",", ".")) != 0 && obj[i][keys[j]].replace(",", ".") != null && obj[i][keys[j - 1]].replace(",", ".") != null && Math.abs(Number(obj[i][keys[j]].replace(",", "."))) > correzzioni.valoreMaxPicco * Math.abs(Number(obj[i][keys[j - 1]].replace(",", ".")) + 1)) {
                                    var index = undefined;
                                    for (var k = j + 1; k < keys.length; k++) {
                                        if (Math.abs(Number(obj[i][keys[k]].replace(",", "."))) <= correzzioni.valoreMaxPicco * Math.abs(Number(obj[i][keys[j - 1]].replace(",", ".")) + 1)) {
                                            index = k;
                                            break;
                                        } else if (k == keys.length - 1) {
                                            index = j - 1;
                                        }
                                    }
                                    var mean = String((Number(obj[i][keys[j - 1]].replace(",", ".")) + Number(obj[i][keys[index]].replace(",", "."))) / 2);
                                    for (var k = j; k < index; k++) {
                                        obj[i][keys[k]] = mean;
                                    }
                                }
                            }
                        }
                    }
                }

                var year0 = Number(dateComponents[0]), month0 = Number(dateComponents[1]) - 1, day0 = Number(dateComponents[2]);
                var year1 = year0, month1 = month0, day1 = day0 + Number(req.params.daysNumber);
                var start = new Date(year0, month0, day0, 0, 0, 0, 0).getTime();
                var end = new Date(year1, month1, day1, 0, 1440, 0, 0).getTime();
                console.log("start: ", new Date(year0, month0, day0, 0, 0, 0, 0));
                console.log("end: ", new Date(year1, month1, day1, 0, 1440, 0, 0));
                var GD = [], now = new Date().getTime();
                // console.log("intervallo: ",(new Date(year1, month1, day1, 0, 1440, 0, 0).getMinutes()-new Date(year0, month0, day0, 0, 0, 0, 0).getMinutes()));
                // console.log(new Date(year1, month1, day1, 0, 1440).getMinutes()+"=="+new Date(year0, month0, day0, 0, 0).getMinutes());
                for (var i = 0; i < (new Date(year1, month1, day1, 0, 1440, 0, 0).getTime() / 60000 - new Date(year0, month0, day0, 0, 0, 0, 0).getTime() / 60000); i += timing) {
                    // console.log("entro");
                    var t0 = new Date(year0, month0, day0, 0, i, 0, 0).getTime();
                    //var t1 = new Date(year1, month1, day1, 0, i, 0, 0).getTime();
                    var flag0 = true;
                    //var flag1= true;
                    for (var j in obj) {
                        //scorre i vari valori da plottare e prende solo quelli che non sono di tipo count.. e quelli da plottare
                        if (j.indexOf("count") == -1 && properties.indexOf(j) != -1) {

                            for (var k in obj[j]) {
                                // console.log("k: ",k);
                                if (t0 <= now && flag0 && k >= t0 && k < t0 + timing * 60000) {
                                    flag0 = false;
                                    GD.push({
                                        date: parseDate(t0),
                                        timestamp: t0
                                    });
                                }
                                /*if (t1 <= now && flag1 && k >= t1 && k< t1+timing*60000) {
                                 flag1=false;
                                 GD.push({
                                 date: parseDate(t1),
                                 timestamp: t1
                                 });
                                 }*/
                            }
                            break;

                        }
                    }

                }
                GD.sort(function (a, b) {
                    return a.timestamp - b.timestamp;
                });

                for (var i in obj) {
                    for (var j in obj[i]) {
                        for (var k = 0; k < GD.length; k++) {
                            if (k === GD.length - 1) {
                                var nextDay = new Date(year1, month1, day1 + 1, 0, 0, 0, 0).getTime();
                                if (Number(j) >= Number(GD[k].timestamp) && Number(j) < Number(nextDay)) {
                                    // if (typeof GD[k][i] === "undefined") {
                                    GD[k][i] = Number(obj[i][j].replace(",", "."));
                                    // } else {
                                    //     GD[k][i] += Number(obj[i][j].replace(",", "."));
                                    // }
                                }
                            } else {
                                if (Number(j) >= Number(GD[k].timestamp) && Number(j) < Number(GD[k + 1].timestamp)) {
                                    //     if (typeof GD[k][i] === "undefined") {
                                    GD[k][i] = Number(obj[i][j].replace(",", "."));
                                    // } else {
                                    //     GD[k][i] += Number(obj[i][j].replace(",", "."));
                                    // }
                                }
                            }
                        }
                    }
                }

                if (type === "avg") {
                    console.log("medio");
                    for (var i in GD) {
                        var keys = Object.keys(GD[i]);
                        for (var j in keys) {
                            var key = Object.keys(GD[i])[j];
                            if (key.indexOf("count") === -1 && key !== "date" && key !== "timestamp") {
                                if (GD[i]["count" + key] == 0) {
                                    GD[i][key] /= (GD[i]["count" + key] + 1);
                                } else {
                                    GD[i][key] /= GD[i]["count" + key];
                                }
                            }
                        }
                    }
                }

                res.status(200).send(GD);
                GD = undefined;
                obj = undefined;
                global.gc();
            });
        } else {
            res.status(200).send({});
        }
    });
});

app.get("/apio/log/getByRange/objectId/:objectId/from/:from/daysNumber/:daysNumber/properties/:properties", function (req, res) {
    var dateComponents = req.params.from.split("-"), tsArray = [];
    // var timing = Number(req.params.timing);
    // var type = req.params.type;
    // for (var i = 0; i <= 1440 * (Number(req.params.daysNumber) + 1); i += timing) {
    //     tsArray.push(new Date(Number(dateComponents[0]), Number(dateComponents[1]) - 1, Number(dateComponents[2]), 0, i).getTime());
    // }
    // if (tsArray.indexOf(new Date(Number(dateComponents[0]), Number(dateComponents[1]) - 1, Number(dateComponents[2]), 0, 1440 * (Number(req.params.daysNumber) + 1)).getTime()) == -1) {
    //     tsArray.push(new Date(Number(dateComponents[0]), Number(dateComponents[1]) - 1, Number(dateComponents[2]), 0, 1440 * (Number(req.params.daysNumber) + 1)).getTime());
    // }
    var startTimestamp = new Date(Number(dateComponents[0]), Number(dateComponents[1]) - 1, Number(dateComponents[2])).getTime();
    var endTimestamp = new Date(Number(dateComponents[0]), Number(dateComponents[1]) - 1, Number(dateComponents[2]) + Number(req.params.daysNumber) + 1).getTime();


    var properties = JSON.parse(req.params.properties);
    console.log("properties: ", properties);
    database.collection("Objects").findOne({
        apioId: req.query.apioId,
        objectId: req.params.objectId
    }, function (err, object) {
        if (err) {
            res.status(200).send({});
        } else if (object) {
            var final = "", obj = {};
            // var processRow = function (row) {
            //     for (var j in row) {
            //         if (j !== "timestamp") {
            //             if (!obj.hasOwnProperty(j)) {
            //                 obj[j] = {};
            //             }
            //
            //             obj[j][row.timestamp] = row[j] === null ? "0" : String(row[j]).replace(".", ",");
            //         }
            //     }
            // };
            var processRow = function (row) {
                for (var j in row) {
                    if (j !== "timestamp") {
                        if (!obj.hasOwnProperty(j)) {
                            obj[j] = {};
                        }

                        //obj[j][row.timestamp] = row[j] === null ? "0" : String(row[j]).replace(".", ",");
                        if (row[j] != null && j.indexOf("count") == -1) {
                            obj[j][row.timestamp] = String(row[j]).replace(".", ",");
                        } else if (row[j] != null && j.indexOf("count") == 0 && String(row[j]) != "0") {
                            obj[j][row.timestamp] = String(row[j]);
                        }
                    }
                }
            };

            // for (var i = 0; i < tsArray.length - 1; i++) {
            var query = "SELECT ";
            for (var j in properties) {
                if (properties[j] != "log") {
                    if (query === "SELECT ") {
                        query += "`" + properties[j] + "` AS `" + properties[j] + "`";
                    } else {
                        query += ", `" + properties[j] + "` AS `" + properties[j] + "`";
                    }
                }
            }


            query += ", timestamp  FROM `" + req.params.objectId + "_" + req.query.apioId + "` WHERE (timestamp >= '" + startTimestamp + "' AND timestamp < '" + endTimestamp + "') ORDER BY timestamp DESC";

            if (final) {
                final += " UNION " + query;
            } else {
                final = query;
            }
            // }

            final = "SELECT * FROM (" + final + ") AS T";
            // console.log("final: ",final);
            sql_db.query(final).on("result", function (row) {
                processRow(row);
            }).on("end", function () {
                ///esclude picchi
                for (var i in obj) {
                    if (i.indexOf("count") != 0) {
                        var keys = Object.keys(obj[i]);
                        for (var j = 0; j < keys.length; j++) {
                            if (j > 0) {
                                // console.log("1",Math.abs(Number(obj[i][keys[j]])),"2",100* Math.abs(Number(obj[i][keys[j == keys.length -1 ?j-1:j+1]])+1))
                                if (Math.abs(Number(obj[i][keys[j]].replace(",", "."))) > 100 * Math.abs(Number(obj[i][keys[j - 1]].replace(",", ".")) + 1)) {
                                    var index = undefined;
                                    for (var k = j + 1; k < keys.length; k++) {
                                        if (Math.abs(Number(obj[i][keys[k]].replace(",", "."))) <= 100 * Math.abs(Number(obj[i][keys[j - 1]].replace(",", ".")) + 1)) {
                                            index = k;
                                            break;
                                        } else if (k == keys.length - 1) {
                                            index = j - 1;
                                        }
                                    }
                                    var mean = String((Number(obj[i][keys[j - 1]].replace(",", ".")) + Number(obj[i][keys[index]].replace(",", "."))) / 2);
                                    for (var k = j; k < index; k++) {
                                        obj[i][keys[k]] = mean;
                                    }
                                }
                            }
                        }
                    }
                }

                res.status(200).send(obj);
            });
            // {
            //     var year0 = Number(dateComponents[0]), month0 = Number(dateComponents[1]) - 1, day0 = Number(dateComponents[2]);
            //     var year1 = year0, month1 = month0, day1 = day0 + Number(req.params.daysNumber);
            //     var start = new Date(year0, month0, day0, 0, 0, 0, 0).getTime();
            //     var end = new Date(year1, month1, day1, 0, 1440, 0, 0).getTime();
            //     console.log("start: ", new Date(year0, month0, day0, 0, 0, 0, 0));
            //     console.log("end: ", new Date(year1, month1, day1, 0, 1440, 0, 0));
            //     var GD = [], now = new Date().getTime();
            //     // console.log("intervallo: ",(new Date(year1, month1, day1, 0, 1440, 0, 0).getMinutes()-new Date(year0, month0, day0, 0, 0, 0, 0).getMinutes()));
            //     // console.log(new Date(year1, month1, day1, 0, 1440).getMinutes()+"=="+new Date(year0, month0, day0, 0, 0).getMinutes());
            //     for (var i = 0; i < (new Date(year1, month1, day1, 0, 1440, 0, 0).getTime() / 60000 - new Date(year0, month0, day0, 0, 0, 0, 0).getTime() / 60000); i += timing) {
            //         // console.log("entro");
            //         var t0 = new Date(year0, month0, day0, 0, i, 0, 0).getTime();
            //         //var t1 = new Date(year1, month1, day1, 0, i, 0, 0).getTime();
            //         var flag0 = true;
            //         //var flag1= true;
            //         for (var j in obj) {
            //             //scorre i vari valori da plottare e prende solo quelli che non sono di tipo count.. e quelli da plottare
            //             if (j.indexOf("count") == -1 && properties.indexOf(j) != -1) {
            //
            //                 for (var k in obj[j]) {
            //                     // console.log("k: ",k);
            //                     if (t0 <= now && flag0 && k >= t0 && k < t0 + timing * 60000) {
            //                         flag0 = false;
            //                         GD.push({
            //                             date: parseDate(t0),
            //                             timestamp: t0
            //                         });
            //                     }
            //                     /*if (t1 <= now && flag1 && k >= t1 && k< t1+timing*60000) {
            //                      flag1=false;
            //                      GD.push({
            //                      date: parseDate(t1),
            //                      timestamp: t1
            //                      });
            //                      }*/
            //                 }
            //                 break;
            //
            //             }
            //         }
            //
            //     }
            //     GD.sort(function (a, b) {
            //         return a.timestamp - b.timestamp;
            //     });
            //
            //     for (var i in obj) {
            //         for (var j in obj[i]) {
            //             for (var k = 0; k < GD.length; k++) {
            //                 if (k === GD.length - 1) {
            //                     var nextDay = new Date(year1, month1, day1 + 1, 0, 0, 0, 0).getTime();
            //                     if (Number(j) >= Number(GD[k].timestamp) && Number(j) < Number(nextDay)) {
            //                         // if (typeof GD[k][i] === "undefined") {
            //                         GD[k][i] = Number(obj[i][j].replace(",", "."));
            //                         // } else {
            //                         //     GD[k][i] += Number(obj[i][j].replace(",", "."));
            //                         // }
            //                     }
            //                 } else {
            //                     if (Number(j) >= Number(GD[k].timestamp) && Number(j) < Number(GD[k + 1].timestamp)) {
            //                         //     if (typeof GD[k][i] === "undefined") {
            //                         GD[k][i] = Number(obj[i][j].replace(",", "."));
            //                         // } else {
            //                         //     GD[k][i] += Number(obj[i][j].replace(",", "."));
            //                         // }
            //                     }
            //                 }
            //             }
            //         }
            //     }
            //
            //     if (type === "avg") {
            //         console.log("medio");
            //         for (var i in GD) {
            //             var keys = Object.keys(GD[i]);
            //             for (var j in keys) {
            //                 var key = Object.keys(GD[i])[j];
            //                 if (key.indexOf("count") === -1 && key !== "date" && key !== "timestamp") {
            //                     if (GD[i]["count" + key] == 0) {
            //                         GD[i][key] /= (GD[i]["count" + key] + 1);
            //                     } else {
            //                         GD[i][key] /= GD[i]["count" + key];
            //                     }
            //                 }
            //             }
            //         }
            //     }
            //
            //     res.status(200).send(GD);
            //     GD = undefined;
            //     obj = undefined;
            //     global.gc();
            // }
        } else {
            res.status(200).send({});
        }
    });
});

app.get("/apio/log/getSumFileByRange/objectId/:objectId/from/:from/until/:until/properties/:properties/type/:type/timing/:timing", function (req, res) {
    var period1 = [JSON.parse(req.params.from)[0].split("-"), JSON.parse(req.params.until)[0].split("-")];
    var period2 = [JSON.parse(req.params.from)[1].split("-"), JSON.parse(req.params.until)[1].split("-")];
    var start1 = new Date(Number(period1[0][0]), Number(period1[0][1]), Number(period1[0][2]), 0, 0, 0, 0).getTime();
    var start2 = new Date(Number(period2[0][0]), Number(period2[0][1]), Number(period2[0][2]), 0, 0, 0, 0).getTime();
    var end1 = new Date(Number(period1[1][0]), Number(period1[1][1]), Number(period1[1][2]), 0, 0, 0, 0).getTime();
    var end2 = new Date(Number(period2[1][0]), Number(period2[1][1]), Number(period2[1][2]), 0, 0, 0, 0).getTime();
    var daysPeriod1 = Number(new Date(Number(period1[1][0]), Number(period1[1][1]), Number(period1[1][2]), 0, 0, 0, 0).getTime() - new Date(Number(period1[0][0]), Number(period1[0][1]), Number(period1[0][2]), 0, 0, 0, 0).getTime()) / (24 * 60 * 60 * 1000);
    var daysPeriod2 = Number(new Date(Number(period2[1][0]), Number(period2[1][1]), Number(period2[1][2]), 0, 0, 0, 0).getTime() - new Date(Number(period2[0][0]), Number(period2[0][1]), Number(period2[0][2]), 0, 0, 0, 0).getTime()) / (24 * 60 * 60 * 1000);
    var timing = Number(req.params.timing);
    var type = req.params.type;
    var properties = JSON.parse(req.params.properties);
    var GD = [], now = new Date().getTime();


    database.collection("Objects").findOne({
        apioId: req.query.apioId,
        objectId: req.params.objectId
    }, function (err, object) {
        if (err) {
            res.status(200).send({});
        } else if (object) {
            var tsArray = [];
            for (var i = 0; i <= 1440 * (daysPeriod1 + 1); i += timing) {
                tsArray.push(new Date(Number(period1[0][0]), Number(period1[0][1]) - 1, Number(period1[0][2]), 0, i).getTime());
            }
            if (tsArray.indexOf(new Date(Number(period1[0][0]), Number(period1[0][1]) - 1, Number(period1[0][2]), 0, 1440 * (daysPeriod1 + 1)).getTime()) == -1) {
                tsArray.push(new Date(Number(period1[0][0]), Number(period1[0][1]) - 1, Number(period1[0][2]), 0, 1440 * (daysPeriod1 + 1)).getTime());
            }
            var final = "", obj1 = {};

            var processRow = function (row) {
                for (var j in row) {
                    if (j !== "timestamp") {
                        if (!obj1.hasOwnProperty(j)) {
                            obj1[j] = {};
                        }
                        if (row[j] != null && j.indexOf("count") == -1) {
                            obj1[j][row.timestamp] = String(row[j]).replace(".", ",");
                        } else if (row[j] != null && j.indexOf("count") == 0 && String(row[j]) != "0") {
                            obj1[j][row.timestamp] = String(row[j]);
                        }
                    }
                }
            };
            for (var i = 0; i < tsArray.length - 1; i++) {
                var query = "SELECT ";
                for (var j in properties) {
                    if (properties[j] != "log") {
                        if (query === "SELECT ") {
                            query += "SUM(`" + properties[j] + "`) AS `" + properties[j] + "`, COUNT(`" + properties[j] + "`) AS `count" + properties[j] + "`";
                        } else {
                            query += ", SUM(`" + properties[j] + "`) AS `" + properties[j] + "`, COUNT(`" + properties[j] + "`) AS `count" + properties[j] + "`";
                        }
                    }
                }

                query += ", " + tsArray[i] + " AS timestamp FROM `" + req.params.objectId + "_" + req.query.apioId + "` WHERE (timestamp >= " + tsArray[i] + " AND timestamp < " + tsArray[i + 1] + ")";

                if (final) {
                    final += " UNION " + query;
                } else {
                    final = query;
                }
            }

            final = "SELECT * FROM (" + final + ") AS T";
            sql_db.query(final).on("result", function (row) {
                processRow(row);
            }).on("end", function () {
                var obj = {};
                tsArray = [];
                for (var i = 0; i <= 1440 * (daysPeriod2 + 1); i += timing) {
                    tsArray.push(new Date(Number(period2[0][0]), Number(period2[0][1]) - 1, Number(period2[0][2]), 0, i).getTime());
                }
                if (tsArray.indexOf(new Date(Number(period2[0][0]), Number(period2[0][1]) - 1, Number(period2[0][2]), 0, 1440 * (daysPeriod2 + 1)).getTime()) == -1) {
                    tsArray.push(new Date(Number(period2[0][0]), Number(period2[0][1]) - 1, Number(period2[0][2]), 0, 1440 * (daysPeriod2 + 1)).getTime());
                }
                var final = "", obj2 = {};
                var processRow = function (row) {
                    for (var j in row) {
                        if (j !== "timestamp") {
                            if (!obj2.hasOwnProperty(j)) {
                                obj2[j] = {};
                            }
                            if (row[j] != null && j.indexOf("count") == -1) {
                                obj2[j][row.timestamp] = String(row[j]).replace(".", ",");
                            } else if (row[j] != null && j.indexOf("count") == 0 && String(row[j]) != "0") {
                                obj2[j][row.timestamp] = String(row[j]);
                            }
                        }
                    }
                };

                for (var i = 0; i < tsArray.length - 1; i++) {
                    var query = "SELECT ";
                    for (var j in properties) {
                        if (properties[j] != "log") {
                            if (query === "SELECT ") {
                                query += "SUM(`" + properties[j] + "`) AS `" + properties[j] + "`, COUNT(`" + properties[j] + "`) AS `count" + properties[j] + "`";
                            } else {
                                query += ", SUM(`" + properties[j] + "`) AS `" + properties[j] + "`, COUNT(`" + properties[j] + "`) AS `count" + properties[j] + "`";
                            }
                        }
                    }

                    query += ", " + tsArray[i] + " AS timestamp FROM `" + req.params.objectId + "_" + req.query.apioId + "` WHERE (timestamp >= " + tsArray[i] + " AND timestamp < " + tsArray[i + 1] + ")";

                    if (final) {
                        final += " UNION " + query;
                    } else {
                        final = query;
                    }
                }
                final = "SELECT * FROM (" + final + ") AS T";
                sql_db.query(final).on("result", function (row) {
                    processRow(row);
                }).on("end", function () {
                    ///esclude picchi 1
                    for (var i in obj1) {
                        if (i.indexOf("count") != 0) {
                            var keys = Object.keys(obj1[i]);
                            for (var j = 0; j < keys.length; j++) {
                                if (j > 0) {
                                    // console.log("1",Math.abs(Number(obj[i][keys[j]])),"2",100* Math.abs(Number(obj[i][keys[j == keys.length -1 ?j-1:j+1]])+1))
                                    if (Math.abs(Number(obj1[i][keys[j]].replace(",", "."))) > 100 * Math.abs(Number(obj1[i][keys[j - 1]].replace(",", ".")) + 1)) {
                                        var index = undefined;
                                        for (var k = j + 1; k < keys.length; k++) {
                                            if (Math.abs(Number(obj1[i][keys[k]].replace(",", "."))) <= 100 * Math.abs(Number(obj1[i][keys[j - 1]].replace(",", ".")) + 1)) {
                                                index = k;
                                                break;
                                            } else if (k == keys.length - 1) {
                                                index = j - 1;
                                            }
                                        }
                                        var mean = String((Number(obj1[i][keys[j - 1]].replace(",", ".")) + Number(obj1[i][keys[index]].replace(",", "."))) / 2);
                                        for (var k = j; k < index; k++) {
                                            obj1[i][keys[k]] = mean;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    ///esclude picchi 2
                    for (var i in obj2) {
                        if (i.indexOf("count") != 0) {
                            var keys = Object.keys(obj2[i]);
                            for (var j = 0; j < keys.length; j++) {
                                if (j > 0) {
                                    // console.log("1",Math.abs(Number(obj[i][keys[j]])),"2",100* Math.abs(Number(obj[i][keys[j == keys.length -1 ?j-1:j+1]])+1))
                                    if (Math.abs(Number(obj2[i][keys[j]].replace(",", "."))) > 100 * Math.abs(Number(obj2[i][keys[j - 1]].replace(",", ".")) + 1)) {
                                        var index = undefined;
                                        for (var k = j + 1; k < keys.length; k++) {
                                            if (Math.abs(Number(obj2[i][keys[k]].replace(",", "."))) <= 100 * Math.abs(Number(obj2[i][keys[j - 1]].replace(",", ".")) + 1)) {
                                                index = k;
                                                break;
                                            } else if (k == keys.length - 1) {
                                                index = j - 1;
                                            }
                                        }
                                        var mean = String((Number(obj2[i][keys[j - 1]].replace(",", ".")) + Number(obj2[i][keys[index]].replace(",", "."))) / 2);
                                        for (var k = j; k < index; k++) {
                                            obj2[i][keys[k]] = mean;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // console.log("obj1",obj1);
                    // console.log("obj2",obj2);
                    var flag1 = false;
                    var flag2 = false;
                    if (new Date(Number(period1[0][0]), Number(period1[0][1]) - 1, Number(period1[0][2]), 0, 0, 0, 0).getTime() < new Date(Number(period2[0][0]), Number(period2[0][1]) - 1, Number(period2[0][2]), 0, 0, 0, 0).getTime()) {
                        var start = new Date(Number(period1[0][0]), Number(period1[0][1]) - 1, Number(period1[0][2]), 0, 0, 0, 0).getTime();
                        // var start_date = [Number(period1[0][0]), Number(period1[0][1]), Number(period1[0][2])];
                        flag1 = true;
                    } else {
                        var start = new Date(Number(period2[0][0]), Number(period2[0][1]) - 1, Number(period2[0][2]), 0, 0, 0, 0).getTime();
                        // var start_date = [Number(period2[0][0]), Number(period2[0][1]), Number(period2[0][2])];
                        flag2 = true;
                    }
                    // if (new Date(Number(period1[1][0]), Number(period1[1][1]) - 1, Number(period1[1][2]), 0, 0, 0, 0).getTime() > new Date(Number(period2[1][0]), Number(period2[1][1]) - 1, Number(period2[1][2]), 0, 0, 0, 0).getTime()) {
                    //     var end = new Date(Number(period1[1][0]), Number(period1[1][1]) - 1, Number(period1[1][2]), 24, 0, 0, 0).getTime();
                    //     // var end_date = [Number(period1[1][0]), Number(period1[1][1]), Number(period1[1][2])];
                    // } else {
                    var end = start + Math.max(daysPeriod1, daysPeriod2) * 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000;
                    //
                    //     // var end_date = [Number(period2[1][0]), Number(period2[1][1]), Number(period2[1][2])];
                    // }
                    // var diff = (end - start) / 24 / 60 / 60 / 1000;


                    // for (var i = 0; i < Math.max(daysPeriod1, daysPeriod2) * 24 * 60; i += timing) { //original_good
                    //     var t_date = new Date(start_date[0], start_date[1] - 1, start_date[2], 0, i, 0, 0);
                    //     var t = t_date.getTime();
                    //     var flag_plot = true;
                    //     if (flag1) {
                    //         for (var j in obj1) {
                    //             if (j.indexOf("count") == -1 /*&& plot.indexOf(j)!=-1*/) {
                    //                 for (k in obj1[j]) {
                    //                     if (flag_plot && k >= t && k < t + timing * 60000) {
                    //                         flag_plot = false;
                    //                         GD.push({
                    //                             date: parseDate(t),
                    //                             timestamp: t
                    //                         });
                    //                     }
                    //                 }
                    //                 break;
                    //             }
                    //         }
                    //         if (daysPeriod1 < daysPeriod2) {
                    //             for (var j in obj2) {
                    //                 if (j.indexOf("count") == -1 /*&& plot.indexOf(j)!=-1*/) {
                    //                     for (k in obj2[j]) {
                    //                         if (flag_plot && k >= t && k < t + timing * 60000) {
                    //                             flag_plot = false;
                    //                             GD.push({
                    //                                 date: parseDate(t),
                    //                                 timestamp: t
                    //                             });
                    //                         }
                    //                     }
                    //                 }
                    //             }
                    //         }
                    //     } else if (flag2) {
                    //
                    //     }
                    // }

                    console.log("flag1", flag1);
                    console.log("flag2", flag2);

                    var filter = function (elem) {
                        return elem.timestamp == this;
                    };
                    if (flag1) {
                        console.log(1);
                        for (var j in obj1) {
                            console.log(2);
                            // if (j.indexOf("count") == -1 /*&& plot.indexOf(j)!=-1*/) {
                            for (var k in obj1[j]) {
                                console.log("entro quii", k);
                                GD.push({
                                    date: parseDate(k),
                                    timestamp: Number(k)
                                });
                            }
                            break;
                        }
                        // if (daysPeriod1 < daysPeriod2) {
                        for (var j in obj2) {// metto tutti i tempi in GD relativi al secondo periodo
                            console.log(2);
                            // if (j.indexOf("count") == -1 /*&& plot.indexOf(j)!=-1*/) {
                            for (var k in obj2[j]) {
                                console.log(2);
                                // flag_plot = false;
                                // if (GD.indexOf({date: parseDate(Number(k) - (start2 - start1)), timestamp: Number(k) - (start2 - start1)}) == -1) {
                                if (GD.filter(filter, (Number(k) - (start2 - start1))).length == 0) {
                                    GD.push({
                                        date: parseDate(Number(k) - (start2 - start1)),
                                        timestamp: Number(k) - (start2 - start1)
                                    });
                                }
                            }
                            break
                        }
                        // }
                    } else if (flag2) {
                        for (var j in obj2) {
                            console.log(3);
                            // if (j.indexOf("count") == -1 /*&& plot.indexOf(j)!=-1*/) {
                            for (var k in obj2[j]) {
                                // flag_plot = false;
                                GD.push({
                                    date: parseDate(k),
                                    timestamp: Number(k)
                                });
                                // }
                            }
                            break

                        }
                        // if (daysPeriod2 < daysPeriod1) {
                        for (var j in obj1) {
                            console.log(4);
                            // if (j.indexOf("count") == -1 /*&& plot.indexOf(j)!=-1*/) {
                            for (k in obj1[j]) {
                                // if (GD.indexOf({date: parseDate(Number(k) - (start1 - start2)), timestamp: Number(k) - (start1 - start2)}) == -1) {
                                if (GD.filter(filter, (Number(k) - (start1 - start2))).length == 0) {
                                    console.log("entro qui: ");
                                    GD.push({
                                        date: parseDate(Number(k) - (start1 - start2)),
                                        timestamp: Number(k) - (start1 - start2)
                                    });
                                }

                                // }

                            }
                            break

                        }
                        // }
                    }

                    //     if(GD.indexOf({date: new Date(t_date.setDate(t_date.getDate() - diff))})==-1) {
                    //         GD.push({
                    //             date: new Date(t_date.setDate(t_date.getDate() - diff))
                    //         });
                    //     }
                    //     if(GD.indexOf({date: new Date(Number(zeroComponents[0]), Number(zeroComponents[1]) - 1, Number(zeroComponents[2]), 0, i, 0, 0)})==-1) {
                    //         GD.push({
                    //             date: new Date(Number(zeroComponents[0]), Number(zeroComponents[1]) - 1, Number(zeroComponents[2]), 0, i, 0, 0)
                    //         });
                    //     }


                    GD.sort(function (a, b) {
                        return a.timestamp - b.timestamp;
                    });

                    var flagGroup = [false, false];
                    if (flag1) {
                        for (var i in obj1) {
                            for (var j in obj1[i]) {
                                for (var c = 0; c < GD.length; c++) {
                                    if (j == GD[c].timestamp) {
                                        flagGroup[0] = true;
                                        GD[c][i + "p1"] = Number(obj1[i][j].replace(",", "."));
                                    }
                                }
                            }
                        }
                        for (var i in obj2) {
                            for (var j in obj2[i]) {
                                for (var c = 0; c < GD.length; c++) {
                                    if (Number(j) == Number(GD[c].timestamp) + (start2 - start1)) {
                                        flagGroup[1] = true;
                                        GD[c][i + "p2"] = Number(obj2[i][j].replace(",", "."));

                                    }
                                }
                            }
                        }
                    }
                    if (flag2) {
                        for (var i in obj1) {
                            for (var j in obj1[i]) {
                                for (var c = 0; c < GD.length; c++) {
                                    // console.log(j+"==="+ (Number(GD[c].timestamp) + (start1 - start2)));
                                    if (Number(j) == Number(GD[c].timestamp) + (start1 - start2)) {
                                        flagGroup[0] = true;
                                        GD[c][i + "p1"] = Number(obj1[i][j].replace(",", "."));
                                    }
                                }
                            }
                        }
                        for (var i in obj2) {
                            for (var j in obj2[i]) {
                                for (var c = 0; c < GD.length; c++) {
                                    if (j == GD[c].timestamp) {
                                        flagGroup[1] = true;
                                        GD[c][i + "p2"] = Number(obj2[i][j].replace(",", "."));

                                    }
                                }
                            }
                        }
                    }

                    // console.log(GD);
                    // for (var i in obj) {
                    //     for (var j in obj[i]) {
                    //         for (var k = 0; k < GD.length; k++) {
                    //             if (k === GD.length - 1) {
                    //                 var nextDay = new Date(year1, month1, day1 + 1, 0, 0, 0, 0).getTime();
                    //                 if (Number(j) >= Number(GD[k].timestamp) && Number(j) < Number(nextDay)) {
                    //                     // if (typeof GD[k][i] === "undefined") {
                    //                     GD[k][i] = Number(obj[i][j].replace(",", "."));
                    //                     // } else {
                    //                     //     GD[k][i] += Number(obj[i][j].replace(",", "."));
                    //                     // }
                    //                 }
                    //             } else {
                    //                 if (Number(j) >= Number(GD[k].timestamp) && Number(j) < Number(GD[k + 1].timestamp)) {
                    //                     //     if (typeof GD[k][i] === "undefined") {
                    //                     GD[k][i] = Number(obj[i][j].replace(",", "."));
                    //                     // } else {
                    //                     //     GD[k][i] += Number(obj[i][j].replace(",", "."));
                    //                     // }
                    //                 }
                    //             }
                    //         }
                    //     }
                    // }

                    // console.log(GD);
                    if (type === "avg") {//da vedere
                        console.log("medio");
                        for (var i in GD) {
                            var keys = Object.keys(GD[i]);
                            for (var j in keys) {
                                var key = Object.keys(GD[i])[j];
                                if (key.indexOf("count") === -1 && key !== "date" && key !== "timestamp") {
                                    if (GD[i]["count" + key] == 0) {
                                        GD[i][key] /= (GD[i]["count" + key] + 1);
                                    } else {
                                        GD[i][key] /= GD[i]["count" + key];
                                    }
                                }
                            }
                        }
                    }

                    // if (type === "avg") {
                    //     for (var c = 0; c < GD.length; c++) {
                    //         for (var f in GD[c]) {
                    //             if (f !== "date" && f.indexOf("count") === -1) {
                    //                 if (GD[c]["count" + f]==0) {
                    //                     GD[c][f] /= (GD[c]["count" + f]+1);
                    //                 }else{
                    //                     GD[c][f] /= GD[c]["count" + f];
                    //                 }
                    //             }
                    //         }
                    //     }
                    // }
                    res.status(200).send({GD: GD, start: start, end: end, flagGroup: flagGroup});
                    GD = undefined;
                    obj1 = undefined;
                    obj2 = undefined;
                    global.gc();
                });
            });
        } else {
            res.status(200).send({});
        }
    });
});

app.post("/apio/log", function (req, res) {
    var obj = {}, endTimestamp = undefined, startTimestamp = undefined, query = "", whereClause = "";
    var processRow = function (row) {
        for (var j in row) {
            if (j !== "id" && j !== "timestamp") {
                if (!obj.hasOwnProperty(j)) {
                    obj[j] = {};
                }

                obj[j][row.timestamp] = row[j] === null ? "-" : String(row[j]).replace(".", ",");
            }
        }
    };

    var final = function () {
        sql_db.query(query).on("error", function (err) {
            res.status(500).send(err);
        }).on("result", function (row) {
            processRow(row);
        }).on("end", function () {
            ///esclude picchi
            for (var i in obj) {
                if (i.indexOf("count") != 0) {
                    var keys = Object.keys(obj[i]);
                    for (var j = 0; j < keys.length; j++) {
                        if (j > 0) {
                            // console.log("1",Math.abs(Number(obj[i][keys[j]])),"2",100* Math.abs(Number(obj[i][keys[j == keys.length -1 ?j-1:j+1]])+1))
                            if (Math.abs(Number(obj[i][keys[j]].replace(",", "."))) > 100 * Math.abs(Number(obj[i][keys[j - 1]].replace(",", ".")) + 1)) {
                                var index = undefined;
                                for (var k = j + 1; k < keys.length; k++) {
                                    if (Math.abs(Number(obj[i][keys[k]].replace(",", "."))) <= 100 * Math.abs(Number(obj[i][keys[j - 1]].replace(",", ".")) + 1)) {
                                        index = k;
                                        break;
                                    } else if (k == keys.length - 1) {
                                        index = j - 1;
                                    }
                                }
                                var mean = String((Number(obj[i][keys[j - 1]].replace(",", ".")) + Number(obj[i][keys[index]].replace(",", "."))) / 2);
                                for (var k = j; k < index; k++) {
                                    obj[i][keys[k]] = mean;
                                }
                            }
                        }
                    }
                }
            }
            res.status(200).send(obj);
            obj = undefined;
            global.gc();
        });
    };

    //Start date and end date in Internet date/time format
    if (req.body.from && req.body.to) {
        var endComponents = req.body.to.split("-");
        var startComponents = req.body.from.split("-");

        endTimestamp = new Date(Number(endComponents[0]), Number(endComponents[1]) - 1, Number(endComponents[2])).getTime();
        startTimestamp = new Date(Number(startComponents[0]), Number(startComponents[1]) - 1, Number(startComponents[2])).getTime();

        if (startTimestamp > endTimestamp) {
            var c = startTimestamp;
            startTimestamp = endTimestamp;
            endTimestamp = c;
        }

        endTimestamp = new Date(endTimestamp + 24 * 60 * 60 * 1000).getTime();

        whereClause = " WHERE `timestamp` >= '" + startTimestamp + "' AND `timestamp` < '" + endTimestamp + "'";
    }

    if (req.body.type === "all") {
        query = "SELECT * FROM `" + req.body.objectId + "_" + req.body.apioId + "`" + whereClause + " ORDER BY `timestamp`";
        final();
    } else if (req.body.type.indexOf("-") > -1) {
        var operand = req.body.type.split("-")[0].toUpperCase();
        var step = Number(req.body.type.split("-")[1]);

        var follow = function () {
            var D = new Date(startTimestamp);
            var daysNumber = Math.ceil((endTimestamp - startTimestamp) / 1000 / 60 / 60 / 24) + 1;
            var tsArray = [];
            var now = new Date();
            for (var i = 0; i <= 1440 * daysNumber; i += step) {
                var dateToPush = new Date(D.getFullYear(), D.getMonth(), D.getDate(), 0, i).getTime();
                if (dateToPush <= now) {
                    tsArray.push(dateToPush);
                }
            }

            database.collection("Objects").findOne({
                apioId: req.body.apioId,
                objectId: req.body.objectId
            }, function (err, object) {
                if (err) {
                    res.status(500).send(err);
                } else if (object) {
                    for (var i = 0; i < tsArray.length - 1; i++) {
                        var temp = "SELECT ";
                        for (var j in object.properties) {
                            if (temp === "SELECT ") {
                                temp += operand + "(`" + j + "`) AS `" + j + "`";
                            } else {
                                temp += ", " + operand + "(`" + j + "`) AS `" + j + "`";
                            }
                        }

                        temp += ", " + tsArray[i] + " AS timestamp FROM `" + req.body.objectId + "_" + req.body.apioId + "` WHERE (timestamp >= " + tsArray[i] + " AND timestamp < " + tsArray[i + 1] + ")";

                        if (query) {
                            query += " UNION " + temp;
                        } else {
                            query = temp;
                        }
                    }

                    query = "SELECT * FROM (" + query + ") AS T" + whereClause;
                    final();
                } else {
                    res.sendStatus(404);
                }
            });
        };

        if (endTimestamp === undefined && startTimestamp === undefined) {
            sql_db.query("SELECT MAX(`timestamp`) as `max`, MIN(`timestamp`) as `min` FROM `" + req.body.objectId + "_" + req.body.apioId + "`", function (error, result) {
                if (error) {
                    res.status(500).send(error);
                } else if (result) {
                    endTimestamp = Number(result[0].max);
                    startTimestamp = Number(result[0].min);
                    follow();
                }
            });
        } else {
            follow();
        }
    } else {
        res.status(500).send("Wrong format of data");
    }
});

app.post("/apio/log/data/insert", function (req, res) {
    if (req.body.data.command == "$push") {
        var data = {};
        database.collection("Objects").update({objectId: req.body.data.who}, {$push: {"data.manutenzione": req.body.data.data}}, function (e, r) {
            if (e) {
                res.sendStatus(500);
            } else {
                res.sendStatus(200);

            }
        });
    } else if (req.body.data.command == "$set") {
        database.collection("Objects").update({objectId: req.body.data.who}, {$set: {data: req.body.data.data}}, function (e, r) {
            if (e) {
                res.sendStatus(500);
            } else {
                res.sendStatus(200);
            }
        });
    }
});