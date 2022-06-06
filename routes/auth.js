const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../database/connection');

const saltRounds = 15;

router.get('/refresh', (req, res) => {
  const { cookies } = req;

  if (!cookies?.session) return res.sendStatus(401);
  const refreshToken = cookies.session;

  try {
    pool.getConnection((err, db) => {
      const query = 'SELECT * FROM users WHERE refresh_token = ?';
      db.query(query, [refreshToken], (error, result, fields) => {
        if (result[0]) {
          jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, payload) => {
            if (err || result[0].email !== payload.email) return res.sendStatus(403);

            const user = {
              id: payload.id,
              email: payload.email,
              firstName: payload.firstName,
              lastName: payload.lastName,
              role: payload.role
            };

            const accessToken = jwt.sign(user, process.env.JWT_SECRET, {
              expiresIn: '30s'
            });

            res.status(202).json({ claims: user, accessToken });
          });
        } else {
          return res.sendStatus(403);
        }
      });
      db.release();
    });
  } catch (e) {
    return res.sendStatus(403);
  }
});

router.post('/api/users/register', (req, res) => {
  const {
    email, password, firstName, lastName, dateOfBirth, userRole, classId
  } = req.body;
  try {
    if (!userRole || (userRole !== 'TEACHER' && userRole !== 'STUDENT')) {
      res.send({
        message: 'Please choose the role: TEACHER or STUDENT.'
      });
      return;
    } if (userRole === 'STUDENT') {
      checkAge(dateOfBirth);
    }

    checkEmail(email);
    checkNameAndSurname(firstName, lastName);
    bcrypt.hash(password, saltRounds, (error, hash) => {
      if (!error) {
        pool.getConnection((err, db) => {
          const query = 'INSERT INTO users (user_role, email, password, first_name, last_name, date_of_birth, class_id) VALUES (?, ?, ?, ?, ?, ?, ?)';

          db.query(
            query,
            [userRole, email, hash, firstName, lastName, dateOfBirth, classId],
            (error, result, fields) => {
              if (result && result.affectedRows === 1) {
                const accessToken = jwt.sign(
                  {
                    email,
                    firstName,
                    lastName,
                    userRole
                  },
                  process.env.JWT_SECRET,
                  { expiresIn: '30s' }
                );

                const refreshToken = jwt.sign(
                  {
                    email,
                    firstName,
                    lastName,
                    role: userRole
                  },
                  process.env.REFRESH_TOKEN_SECRET,
                  { expiresIn: '1d' }
                );

                res.cookie('session', refreshToken, {
                  httpOnly: true,
                  maxAge: 24 * 60 * 60 * 1000 // 1 day
                });
                res.status(202).send({
                  message: `User ${firstName} ${lastName} is registered & logged in!`
                });
              } else {
                res.send({
                  message: 'Something went wrong. Try again.'
                });
              }
            }
          );

          db.release();
        });
      } else {
        res.status(500).send({
          message: 'Something went wrong. Try again.'
        });
      }
    });
  } catch (e) {
    return res.status(422).send({
      message: 'Something went wrong. Try again.'
    });
  }
});

router.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;
  checkEmail(email);
  if (!email || !password) {
    return res.status(422).send({ message: 'Must provide email and password' });
  }
  try {
    pool.getConnection((err, db) => {
      const query = 'SELECT * FROM users WHERE email = ?';
      db.query(query, [email], (error, result, fields) => {
        if (result && result.length) {
          bcrypt.compare(password, result[0].password, (error, match) => {
            if (match) {
              const user = {
                id: result[0].user_id,
                email: result[0].email,
                firstName: result[0].first_name,
                lastName: result[0].last_name,
                role: result[0].user_role
              };

              const accessToken = jwt.sign(user, process.env.JWT_SECRET, {
                expiresIn: '1d'
              });

              const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, {
                expiresIn: '1d'
              });

              // store refresh token with the user
              const query = 'UPDATE users SET refresh_token = ? WHERE email = ?';
              db.query(query, [refreshToken, email], (error, result, fields) => {
                if (result && result.affectedRows) {
                  res.cookie('session', refreshToken, {
                    httpOnly: true,
                    sameSite: 'none',
                    secure: true,
                    maxAge: 24 * 60 * 60 * 1000 // 1 day
                  });
                  console.log(`login successful for: email=${email} password=${password}`);
                  res.status(202).json({ claims: user, accessToken });
                } else {
                  res.status(500).send({ message: 'Something went wrong' });
                }
              });
            } else {
              return res.status(401).send({ message: 'Invalid password or email' });
            }
          });
        } else {
          return res.status(401).send({ message: 'Invalid password or email' });
        }
      });
      db.release();
    });
  } catch (e) {
    return res.status(401).send({ message: 'Invalid password or email' });
  }
});

router.get('/logout', (req, res) => {
  const { cookies } = req;
  if (!cookies?.session) return res.sendStatus(204);
  const refreshToken = cookies.session;

  try {
    pool.getConnection((err, db) => {
      // check if refresh token is inside gb
      const query = 'SELECT * FROM users WHERE refresh_token = ?';
      db.query(query, [refreshToken], (error, result, fields) => {
        if (!result[0]) {
          res.clearCookie('session', { httpOnly: true, sameSite: 'none', secure: true });
          return res.sendStatus(204);
        }

        // delete refresh token from db
        const query = 'UPDATE users SET refresh_token = ? WHERE email = ?';
        db.query(query, ['', result[0].email], (error, result, fields) => {
          if (result && result.affectedRows) {
            res.clearCookie('session', {
              httpOnly: true,
              sameSite: 'none',
              secure: true
            });
            res.sendStatus(200);
          }
        });
      });
      db.release();
    });
  } catch (e) {
    return res.sendStatus(403);
  }
});

// check if student is above 19 years old
const checkAge = (dateOfBirth) => {
  const dateOfBirthType = Object.prototype.toString.call(dateOfBirth);

  if (dateOfBirthType === '[object Date]' || dateOfBirthType === '[object String]') {
    dateOfBirth = Date.parse(dateOfBirth); // check for invalid date pattern if string

    if (isNaN(dateOfBirth)) {
      throw new Error('Invalid string pattern for date');
    }

    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 19);
    return pastDate >= dateOfBirth;
  }
  throw new Error('Invalid format');
};

const checkEmail = (email) => {
  const mailFormat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  if (email.match(mailFormat)) {
    return true;
  }
  throw new Error('Invalid format');
};

const checkNameAndSurname = (firstName, lastName) => {
  const nameFormat = /^\s*([A-Za-z]{1,}([\.,] |[-']| ))+[A-Za-z]+\.?\s*$/; // english ones, for now
  const fullName = `${firstName} ${lastName}`;

  if (fullName.match(nameFormat)) {
    if (fullName.length > 70) {
      throw new Error('Expected length exceeded');
    }
    return true;
  }
  throw new Error('Invalid format');
};

module.exports = {
  checkAge,
  checkEmail,
  checkNameAndSurname,
  router
};
