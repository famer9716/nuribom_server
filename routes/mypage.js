var express = require('express');
var request = require('request');
var dateformat = require('dateformat');
var aws = require('aws-sdk');
var multer = require('multer');
var moment = require('moment');
var multerS3 = require('multer-s3');
aws.config.loadFromPath('./config/aws_config.json');
var pool = require('../config/db_pool');
var s3 = new aws.S3();
var upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: 'joo97',
    acl: 'public-read',
    key: function (req, file, cb) {
      cb(null, Date.now() + '.' + file.originalname.split('.').pop());
    }
  })
});

var router = express.Router();

router.get('/:userid', (req, res) => {
  return new Promise((fulfill, reject) => {
    pool.getConnection((err, connection) => {
      if(err) reject(err);
      else fulfill(connection);
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then((connection) => {
    return new Promise((fulfill, reject) => {
      var query = 'select * from user where userid = ?';
      connection.query(query, req.params.userid, (err, data) => {
        if(err) reject(err);
        else {
          if(data[0]) fulfill(connection);
          else res.status(500).send({message : "no user"});
        }
      });
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then((connection) => {
    return new Promise((fulfill, reject) => {
      var query = 'select count(*) as count from triplike where userid = ?';
      connection.query(query, req.params.userid, (err, data) => {
        var triplike=0;
        if(err) reject(err);
        else {
          if(data[0]) triplike = data[0].count;
          var count = {
            triplike: triplike
          };
          console.log(count);
          fulfill([connection, count]);
        }
      });
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then(([connection,count]) => {
    return new Promise((fulfill, reject) => {
      var query = 'select count(*) as count from courselike where userid = ?';
      console.log(count);
      connection.query(query, req.params.userid, (err, data) => {
        var courselike=0;
        if(err) reject(err);
        else {
          if(data[0]) courselike = data[0].count;
          count = {
            triplike: count.triplike,
            courselike: courselike
          };
          console.log(count);
          fulfill([connection, count]);
        }
      });
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then(([connection,count]) => {
    return new Promise((fulfill, reject) => {
      var query = 'select count(distinct courseid) as count from coursecomment where userid = ?';
      connection.query(query, req.params.userid, (err, data) => {
        var coursecomment=0;
        if(err) reject(err);
        else {
          if(data[0]) coursecomment = data[0].count;
          count = {
            triplike: count.triplike,
            courselike: count.courselike,
            coursecomment: coursecomment
          };
          console.log(count);
          fulfill([connection, count]);
        }
      });
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then(([connection,count]) => {
    return new Promise((fulfill, reject) => {
      var query = 'select count(distinct contentid) as count from tripreviews where userid = ?';
      connection.query(query, req.params.userid, (err, data) => {
        var tripreviews=0;
        if(err) reject(err);
        else {
          if(data[0]) tripreviews = data[0].count;
          count = {
            triplike: count.triplike,
            courselike: count.courselike,
            coursecomment: count.coursecomment,
            tripreviews: tripreviews
          };
          fulfill([connection, count]);
        }
      });
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then(([connection,count]) => {
    return new Promise((fulfill, reject) => {
      var query = 'select count(*) as count from course where userid = ?';
      connection.query(query, req.params.userid, (err, data) => {
        var course=0;
        if(err) res.status(500).send({ message:err});
        else {
          if(data[0]) course = data[0].count;
          count = {
            triplike: count.triplike,
            courselike: count.courselike,
            coursecomment: count.coursecomment,
            tripreviews : count.tripreviews,
            course: course
          };
          res.status(200).send({result:count});
        }
      });
      connection.release();
    });
  })
});

//내가 단 댓글
router.get('/comment/:userid', (req, res) => {
  return new Promise((fulfill, reject) => {
    pool.getConnection((err, connection) => {
      if(err) reject(err);
      else fulfill(connection);
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then((connection) => {
    return new Promise((fulfill, reject) => {
      var query = 'select * from user where userid = ?';
      connection.query(query, req.params.userid, (err, data) => {
        if(err) reject(err);
        else {
          if(data[0]) fulfill(connection);
          else res.status(500).send({message : "no user"});
        }
      });
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then((connection) => {
    return new Promise((fulfill, reject) => {
      var query = 'select distinct courseid from coursecomment where userid = ?';
      connection.query(query, req.params.userid, (err, data) => {
        if(err) reject(err);
        else {
          if(data[0]) fulfill([data,connection]);
          else res.status(500).send({message : "no comment"});
        }
      });
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then(([predata,connection]) => {
    var result = new Array();
    function getdata(i, predata){
      console.log(i);
      return new Promise((fulfill, reject) => {
        var query = 'select * from course where courseid = ?';
        connection.query(query, predata[i].courseid, (err, data) => {
          if(err) res.status(500).send({ message:err});
          else {
            if(data[0]) result[i] = data[0];
            else res.status(200).send({message : "no course"});
            console.log(result);
            if(i === predata.length-1){
              res.status(200).send({result : result});
            }
          }
        });
        if(i === predata.length-1) connection.release();
        else getdata(i+1, predata);
      });
    }
    getdata(0, predata);
  });
});

//coursebookmark
router.get('/courselike/:userid', (req, res) => {
  return new Promise((fulfill, reject) => {
    pool.getConnection((err, connection) => {
      if(err) reject(err);
      else fulfill(connection);
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then((connection) => {
    return new Promise((fulfill, reject) => {
      var query = 'select * from user where userid = ?';
      connection.query(query, req.params.userid, (err, data) => {
        if(err) reject(err);
        else {
          if(data[0]) fulfill(connection);
          else res.status(500).send({message : "no user"});
        }
      });
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then((connection) => {
    return new Promise((fulfill, reject) => {
      var query = 'select distinct courseid from courselike where userid = ?';
      connection.query(query, req.params.userid, (err, data) => {
        if(err) reject(err);
        else {
          if(data[0]) fulfill([data,connection]);
          else res.status(500).send({message : "no like"});
        }
      });
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then(([predata,connection]) => {
    var result = new Array();
    function getdata(i, predata){
      console.log(i);
      return new Promise((fulfill, reject) => {
        var query = 'select * from course where courseid = ?';
        connection.query(query, predata[i].courseid, (err, data) => {
          if(err) res.status(500).send({ message:err});
          else {
            if(data[0]) result[i] = data[0];
            else res.status(200).send({message : "no course"});
            console.log(result);
            if(i === predata.length-1){
              res.status(200).send({result : result});
            }
          }
        });
        if(i === predata.length-1) connection.release();
        else getdata(i+1, predata);
      });
    }
    getdata(0, predata);
  });
});

//내가 쓴글
router.get('/post/:userid', (req, res) => {
  return new Promise((fulfill, reject) => {
    pool.getConnection((err, connection) => {
      if(err) reject(err);
      else fulfill(connection);
    });
  }).catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then((connection) => {
    return new Promise((fulfill, reject) => {
      var query = 'select * from user where userid = ?';
      connection.query(query, req.params.userid, (err, data) => {
        if(err) reject(err);
        else {
          if(data[0]) fulfill(connection);
          else res.status(500).send({message : "no user"});
        }
      });
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then((connection) => {
    return new Promise((fulfill, reject) => {
      if(!(req.params.userid)) res.send({message : 'insert userid'});
      else {
        var query = 'select * from course where userid = ?';
        connection.query(query, req.params.userid, (err, data) => {
          if(err) res.status(500).send({ message:err});
          else {
            if(data[0]) res.status(200).send({result : data});
            else res.status(200).send({message : "no course"});
          }
        });
        connection.release();
      }
    });
  });
});

//review 단 글
router.get('/review/:userid', (req, res) => {
  return new Promise((fulfill, reject) => {
    pool.getConnection((err, connection) => {
      if(err) reject(err);
      else fulfill(connection);
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then((connection) => {
    return new Promise((fulfill, reject) => {
      var query = 'select * from user where userid = ?';
      connection.query(query, req.params.userid, (err, data) => {
        if(err) reject(err);
        else {
          if(data[0]) fulfill(connection);
          else res.status(500).send({message : "no user"});
        }
      });
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then((connection) => {
    return new Promise((fulfill, reject) => {
      var query = 'select distinct contentid from tripreviews where userid = ?';
      connection.query(query, req.params.userid, (err, data) => {
        if(err) reject(err);
        else {
          if(data[0]) fulfill([data,connection]);
          else res.status(500).send({message : "no review"});
        }
      });
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then(([predata,connection]) => {
    var result = new Array();
    function getdata(i, predata){
      console.log(i);
      return new Promise((fulfill, reject) => {
        var query = 'select * from trips where contentid = ?';
        connection.query(query, predata[i].contentid, (err, data) => {
          if(err) res.status(500).send({ message:err});
          else {
            if(data[0]) result[i] = data[0];
            else res.status(200).send({message : "no trip"});
            console.log(result);
            if(i === predata.length-1){
              res.status(200).send({result : result});
            }
          }
        });
        if(i === predata.length-1) connection.release();
        else getdata(i+1, predata);
      });
    }
    getdata(0, predata);
  });
});

//tripbookmark
router.get('/triplike/:userid', (req, res) => {
  return new Promise((fulfill, reject) => {
    pool.getConnection((err, connection) => {
      if(err) reject(err);
      else fulfill(connection);
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then((connection) => {
    return new Promise((fulfill, reject) => {
      var query = 'select * from user where userid = ?';
      connection.query(query, req.params.userid, (err, data) => {
        if(err) reject(err);
        else {
          if(data[0]) fulfill(connection);
          else res.status(500).send({message : "no user"});
        }
      });
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then((connection) => {
    return new Promise((fulfill, reject) => {
      var query = 'select distinct contentid from triplike where userid = ?';
      connection.query(query, req.params.userid, (err, data) => {
        if(err) reject(err);
        else {
          if(data[0]) fulfill([data,connection]);
          else res.status(500).send({message : "no like"});
        }
      });
    });
  })
  .catch(err => { res.status(500).send({ message: "getConnection error: "+err });})
  .then(([predata,connection]) => {
    var result = new Array();
    function getdata(i, predata){
      console.log(i);
      return new Promise((fulfill, reject) => {
        var query = 'select * from trips where contentid = ?';
        connection.query(query, predata[i].contentid, (err, data) => {
          if(err) res.status(500).send({ message:err});
          else {
            if(data[0]) result[i] = data[0];
            else res.status(200).send({message : "no trip"});
            console.log(result);
            if(i === predata.length-1){
              res.status(200).send({result : result});
            }
          }
        });
        if(i === predata.length-1) connection.release();
        else getdata(i+1, predata);
      });
    }
    getdata(0, predata);
  });
});



module.exports = router;
