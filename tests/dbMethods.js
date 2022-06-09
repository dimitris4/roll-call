const { pool } = require('../database/connection');

const saveTeacherToDB = () => new Promise((resolve, reject) => {
  pool.getConnection((err, db) => {
    const query = 'INSERT INTO users (first_name, last_name, email, user_role, password, class_id, date_of_birth) '
                + 'VALUES ("Dimitrios", "Gkiokas", "dimi1@gmail.com", "TEACHER", "$2b$15$uC0sNjstRkK/EBRnCLFkWujCEL.grKhk8NdLSFIccXwVeCR/o6lde", NULL, "1996-10-10");';
    db.query(query, (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result.insertId);
    });
    db.release();
  });
});

const saveLectureToDB = (teacherId, dateTime, courseId, classId) => {
  const lecture = {
    lecture_id: undefined,
    start_date_time: dateTime,
    course_id: courseId,
    class_id: classId,
  };
  return new Promise((resolve, reject) => {
    pool.getConnection((err, db) => {
      const query = `INSERT INTO lectures (teacher_id, start_date_time, course_id, class_id) VALUES (${teacherId},"${dateTime}", ${courseId}, ${classId});`;
      db.query(query, (error, result) => {
        if (error) {
          reject(error);
        }
        lecture.lecture_id = result.insertId;
        resolve(lecture);
      });
      db.release();
    });
  });
};

const saveCourseToDB = (id, name) => new Promise((resolve, reject) => {
  pool.getConnection((err, db) => {
    const query = `INSERT INTO courses (course_id, name) VALUES (${id}, '${name}');`;
    db.query(query, (error) => {
      if (error) {
        reject(error);
      }
      resolve(true);
    });
    db.release();
  });
});

const saveClassToDB = (id, name) => new Promise((resolve, reject) => {
  pool.getConnection((err, db) => {
    const query = `INSERT INTO classes (class_id, name) VALUES (${id}, '${name}');`;
    db.query(query, (error) => {
      if (error) {
        reject(error);
      }
      resolve(true);
    });
    db.release();
  });
});

const deleteLecturesFromDB = () => new Promise((resolve, reject) => {
  pool.getConnection((err, db) => {
    const query = 'DELETE FROM lectures;';
    db.query(query, (error) => {
      if (error) {
        reject(error);
      }
      resolve(true);
    });
    db.release();
  });
});

const deleteTeachersFromDB = () => new Promise((resolve, reject) => {
  pool.getConnection((err, db) => {
    const query = 'DELETE FROM users;';
    db.query(query, (error) => {
      if (error) {
        reject(error);
      }
      resolve(true);
    });
    db.release();
  });
});

const deleteCoursesFromDB = () => new Promise((resolve, reject) => {
  pool.getConnection((err, db) => {
    const query = 'DELETE FROM courses;';
    db.query(query, (error) => {
      if (error) {
        reject(error);
      }
      resolve(true);
    });
    db.release();
  });
});

const deleteClassesFromDB = () => new Promise((resolve, reject) => {
  pool.getConnection((err, db) => {
    const query = 'DELETE FROM classes;';
    db.query(query, (error) => {
      if (error) {
        reject(error);
      }
      resolve(true);
    });
    db.release();
  });
});

const truncateTables = () => new Promise((resolve, reject) => {
  pool.getConnection((err, db) => {
    const query = 'SET FOREIGN_KEY_CHECKS=0; '
          + 'TRUNCATE TABLE courses; '
          + 'TRUNCATE TABLE classes; '
          + 'TRUNCATE TABLE users; '
          + 'TRUNCATE TABLE lectures; '
          + 'TRUNCATE TABLE attendance; '
          + 'SET FOREIGN_KEY_CHECKS=1;';
    db.query(query, (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result);
    });
    db.release();
  });
});

module.exports = {
  saveCourseToDB,
  saveLectureToDB,
  saveTeacherToDB,
  deleteCoursesFromDB,
  deleteLecturesFromDB,
  deleteTeachersFromDB,
  saveClassToDB,
  deleteClassesFromDB,
  truncateTables,
};
