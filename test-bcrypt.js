const bcrypt = require('bcryptjs');

const hashes = {
  'alice123': '$2a$10$fBV4RtdrhxvH60OkuhxMB.A.aKQsd.8rnrmFbwM5ULWZg/MwQjiXG',
  'bob456': '$2a$10$XtPfGZTHSUgHRG2F8vgZB.NLFdaH0mgmlWLSGUgQH98xto1O2qcM6',
  'adminpass': '$2a$10$TRB8CzLFKprecgVZdn8LdeDFHnYN1edCVxU8CpU54fcs1U0my.7Wi'
};

(async () => {
  for (const [pwd, hash] of Object.entries(hashes)) {
    const isValid = await bcrypt.compare(pwd, hash);
    console.log(`${pwd}: ${isValid ? '✓ VALID' : '✗ INVALID'}`);
  }
})();
