const Prismic = require('prismic-javascript');
const PrismicDOM = require('prismic-dom');
const request = require('request');
const Cookies = require('cookies');
const PrismicConfig = require('./prismic-configuration');
const Onboarding = require('./onboarding');
const app = require('./config');

const PORT = app.get('port');

app.listen(PORT, () => {
  Onboarding.trigger();
  process.stdout.write(`Point your browser to: http://localhost:${PORT}\n`);
});

// Middleware to inject prismic context
app.use((req, res, next) => {
  res.locals.ctx = {
    endpoint: PrismicConfig.apiEndpoint,
    linkResolver: PrismicConfig.linkResolver,
  };
  // add PrismicDOM in locals to access them in templates.
  res.locals.PrismicDOM = PrismicDOM;
  Prismic.api(PrismicConfig.apiEndpoint, {
    accessToken: PrismicConfig.accessToken,
    req,
  }).then((api) => {
    req.prismic = { api };
    next();
  }).catch((error) => {
    next(error.message);
  });
});

/*
 *  --[ INSERT YOUR ROUTES HERE ]--
 */
app.get('/about', (req, res) => {
  // We store the param uid in a variable
  // const uid = req.params.uid;

  req.prismic.api.getByUID('page', 'about')
    .then((document) => {
      if (document) {
        res.render('page', { document });
      } else {
        res.status(404).send('404 not found');
      }
    }).catch((error) => {
      res.status(404).send('404 not found');
    });
});

app.get('/hire', (req, res) => {
  req.prismic.api.getByUID('page', 'hire')
    .then((document) => {
      if (document) {
        res.render('page', { document });
      } else {
        res.status(404).send('404 not found');
      }
    }).catch((error) => {
      res.status(404).send('404 not found');
    });
});

app.get('/projects/:uid', (req, res) => {
  // We store the param uid in a variable
  const { uid } = req.params.uid;

  req.prismic.api.getByUID('project', uid)
    .then((document) => {
      if (document) {
        res.render('projectDetail', { document });
      } else {
        res.status(404).send('404 not found');
      }
    }).catch((error) => {
      res.status(404).send('404 not found');
    });
});

app.get('/projects', (req, res) => {
  req.prismic.api.query(
    Prismic.Predicates.at('document.type', 'project'),
    { orderings: '[my.project.project_date desc]' },
  )
    .then((response) => {
      res.render('projects', { projects: response.results });
    }).catch((error) => {
      res.status(404).send('404 not found');
    });
});
/*
 * Route with documentation to build your project with prismic
 */
app.get('/', (req, res) => {
  const projects = req.prismic.api.query(Prismic.Predicates.at('document.type', 'project'))
    .then(response => response.results);
  req.prismic.api.getSingle('homepage')
    .then((homepage) => {
      if (homepage) {
        req.prismic.api.query(Prismic.Predicates.at('document.type', 'project'))
          .then((response) => {
            res.render(
              'home',
              {
                homepage,
                projects: response.results,
              },
            );
          });
      } else {
        res.status(404).send('404 not found');
      }
    });
  //  res.redirect('/help');
});
/*
 * Prismic documentation to build your project with prismic
 */
// app.get('/help', (req, res) => {
//   const repoRegexp = /^(https?:\/\/([-\w]+)\.[a-z]+\.(io|dev))\/api(\/v2)?$/;
//   const [_, repoURL, name, extension, apiVersion] = PrismicConfig.apiEndpoint.match(repoRegexp);
//   const { host } = req.headers;
//   const isConfigured = name !== 'your-repo-name';
//   res.render('help', {
//     isConfigured,
//     repoURL,
//     name,
//     host,
//   });
// });

/*
 * Preconfigured prismic preview
 */
app.get('/preview', (req, res) => {
  const { token } = req.query;
  if (token) {
    req.prismic.api.previewSession(token, PrismicConfig.linkResolver, '/').then((url) => {
      const cookies = new Cookies(req, res);
      cookies.set(Prismic.previewCookie, token, { maxAge: 30 * 60 * 1000, path: '/', httpOnly: false });
      res.redirect(302, url);
    }).catch((err) => {
      res.status(500).send(`Error 500 in preview: ${err.message}`);
    });
  } else {
    res.send(400, 'Missing token from querystring');
  }
});
