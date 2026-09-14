/**
 * missions.js
 * All mission content for the simulation.
 *
 * Everything here is FICTIONAL: invented company names, invented staff,
 * invented domains (".example" / "himalayan-datavault.example" are reserved
 * test domains and can never resolve to a real site). No real organisation,
 * real person or real system is referenced, and nothing here explains how to
 * carry out an attack - only how to recognise and safely report one.
 *
 * Mission shapes
 *  - 'evidence-choice' : find red flags, then pick the safe action
 *  - 'choice'          : pick the safe action
 *  - 'password'        : pick the strongest passphrase
 *  - 'multi'           : pick every safe action (all must be selected)
 *  - 'order'           : place the incident-response steps in order
 */

export const MISSIONS = [
  /* ===================================================================== */
  {
    id: 'm1',
    number: 1,
    type: 'evidence-choice',
    title: 'RED ALERT EMAIL',
    area: 'office',
    hotspot: 'office-pc',
    objective: 'Open the office workstation and examine the suspicious delivery-payment email.',
    hint: 'Look for the glowing monitor on the main desk.',
    points: 100,
    penalty: 15,
    npcLine: 'Commander, this payment email just landed and it does not feel right. Can you check it before anyone clicks?',
    npc: 'anjali',
    eyebrow: 'Inbound message - Warehouse Office',
    headline: 'Urgent delivery payment request',
    /** Rendered as a fake email preview inside the modal. */
    email: {
      from: 'accounts@hima1ayan-datavault-billing.example',
      displayName: 'Himalayan Data Vault Accounts',
      to: 'warehouse.office@himalayan-datavault.example',
      subject: 'URGENT: Delivery payment failed - action required within 2 hours',
      attachment: 'Delivery_Invoice_4471.zip',
      body: [
        'Dear Warehouse Team,',
        'Our records show that payment for delivery batch 4471 has FAILED. The consignment will be returned and your account suspended unless payment is confirmed within 2 hours.',
        'Confirm the payment here: http://secure-payment-verify.example/hdv-login',
        'Please do not discuss this with other departments as the matter is confidential.',
        'Regards, Accounts Department'
      ]
    },
    evidenceTitle: 'Inspect the message - find all four red flags',
    evidence: [
      { id: 'sender', label: 'Check the sender address', hint: 'Tap to inspect', found: 'The domain reads "hima1ayan" with the digit 1 instead of an "l", and it is not the company domain at all. A look-alike domain is a classic sign of a phishing attempt.' },
      { id: 'link', label: 'Hover over the payment link', hint: 'Tap to inspect', found: 'The visible text says "confirm the payment" but the real destination is an unrelated site over plain http. Never sign in through a link sent in an unexpected email.' },
      { id: 'urgency', label: 'Read the tone of the message', hint: 'Tap to inspect', found: 'A two hour deadline, threats of suspension and "do not discuss this with other departments" are pressure tactics designed to stop you checking with a colleague.' },
      { id: 'attachment', label: 'Look at the attachment', hint: 'Tap to inspect', found: 'An unexpected .zip "invoice" from an unknown sender is a common way to deliver malicious software. Invoices from genuine suppliers arrive through the agreed process.' }
    ],
    question: 'You are the Cyber Defence Commander. What is the safe action?',
    choices: [
      { id: 'open', label: 'Open the attachment to check the invoice', correct: false, feedback: 'Opening an unexpected attachment is exactly what the sender wants. A single click can install software that spreads across the warehouse network.' },
      { id: 'report', label: 'Report the phishing email to IT / security and do not click anything', correct: true, feedback: 'Correct. Report it using your organisation’s reporting button or IT contact, leave the message in place, and warn colleagues through a trusted channel - not by forwarding the email itself.' },
      { id: 'forward', label: 'Forward it to all warehouse staff so they are warned', correct: false, feedback: 'Forwarding spreads the dangerous link and attachment to more people. Warn colleagues verbally or through your normal team channel, and let IT send any official warning.' }
    ],
    successTitle: 'Phishing attempt contained',
    successText: 'The message is quarantined and the look-alike domain is blocked at the mail gateway. Nobody clicked the link.',
    failText: 'The Phantom Hacker gained a foothold in the office mailbox. In a real warehouse this is how payment fraud and ransomware usually start.',
    tip: 'Workplace rule: never act on an urgent payment request that arrives by email alone. Verify it with the supplier using a phone number you already hold.'
  },

  /* ===================================================================== */
  {
    id: 'm2',
    number: 2,
    type: 'choice',
    title: 'USB TRAP',
    area: 'bay',
    hotspot: 'usb-drive',
    objective: 'Investigate the unknown USB drive lying next to the delivery scanner in the Loading Bay.',
    hint: 'It is on the floor near the scanner podium.',
    points: 100,
    penalty: 15,
    npcLine: 'Found this USB by the scanner this morning. It has got a payroll sticker on it. Should I plug it in and see whose it is?',
    npc: 'bikash',
    eyebrow: 'Unattended device - Loading Bay',
    headline: 'Unknown USB drive found near the delivery scanner',
    briefing: 'A plain USB drive is lying beside the delivery scanner. It has a handwritten sticker that reads "PAYROLL - Q3 BONUS". Nobody on shift recognises it, and it was not there at the start of the day.',
    question: 'What do you do with the drive?',
    choices: [
      { id: 'plug', label: 'Plug it into the delivery scanner to find the owner', correct: false, feedback: 'Dropping a labelled USB where staff will find it is a deliberate tactic. Plugging it in can run software automatically and reach the systems that control deliveries.' },
      { id: 'report', label: 'Leave it disconnected and hand it to IT / security, logging where it was found', correct: true, feedback: 'Correct. Do not connect it to anything. Hand it to IT or security, tell them exactly where and when it was found, and let them examine it on an isolated system.' },
      { id: 'home', label: 'Take it home and check it on your own laptop', correct: false, feedback: 'Your home laptop has no protection from the company, and anything on the drive could then travel back into the warehouse on your own devices. It also removes evidence from the site.' }
    ],
    successTitle: 'Device handed to security',
    successText: 'The drive is bagged, logged and passed to IT. No warehouse system ever touches it, and the entry point is closed.',
    failText: 'A hostile device reached warehouse equipment. The scanner network is now part of the simulated attack.',
    tip: 'Workplace rule: only ever use USB devices issued and scanned by your organisation. Found devices go to IT, never into a port.'
  },

  /* ===================================================================== */
  {
    id: 'm3',
    number: 3,
    type: 'password',
    title: 'PASSWORD VAULT',
    area: 'staff',
    hotspot: 'staff-pc',
    objective: 'Secure the shared staff-room workstation and deal with the password note stuck to the monitor.',
    hint: 'Check the workstation beside the lockers - and the sticky note.',
    points: 100,
    penalty: 15,
    npcLine: 'That shared login has been "Warehouse2024" since I started, and someone has written it on a sticky note. Can we fix it, Commander?',
    npc: 'maya',
    eyebrow: 'Weak credential - Staff Room',
    headline: 'Shared workstation is protected by a weak password',
    briefing: 'The staff-room workstation is signed in with a weak shared password, and a yellow note on the monitor bezel reads "login: stockroom / pw: warehouse". You have been asked to choose a replacement passphrase for the account.',
    question: 'Choose the strongest replacement passphrase.',
    choices: [
      { id: 'p1', label: 'password123', sub: '11 characters - a dictionary word plus an obvious number', correct: false, strength: 8, feedback: 'This is one of the most common passwords in the world and would be guessed almost instantly by automated tools.' },
      { id: 'p2', label: '123456', sub: '6 characters - sequential digits', correct: false, strength: 3, feedback: 'Six sequential digits gives essentially no protection at all.' },
      { id: 'p3', label: 'warehouse', sub: '9 characters - a single word related to your workplace', correct: false, strength: 12, feedback: 'A single dictionary word, and one an attacker would try first because it matches the workplace. Never use words connected to your employer or role.' },
      { id: 'p4', label: 'Yak-Lantern-Frost-7x!Ridge', sub: '25 characters - four unrelated words, a number and symbols', correct: true, strength: 96, feedback: 'Correct. A long passphrase of unrelated words with a number and symbol is easy to remember and extremely hard to guess. Make it unique to this account, store it in the approved password manager, and never write it on a note.' }
    ],
    extra: {
      title: 'You also remove the sticky note',
      text: 'Written-down credentials in a shared room can be photographed by anyone passing through - including visiting drivers and contractors.'
    },
    successTitle: 'Credentials hardened',
    successText: 'The shared account now uses a long unique passphrase stored in the password manager, and the sticky note has been shredded.',
    failText: 'The weak password stayed in place. The Phantom Hacker guessed it and reached the stock system.',
    tip: 'Workplace rule: long and unique beats short and complicated. Use the approved password manager, and turn on multi-factor authentication wherever it is offered.'
  },

  /* ===================================================================== */
  {
    id: 'm4',
    number: 4,
    type: 'multi',
    title: 'SOCIAL MEDIA LEAK',
    area: 'office',
    hotspot: 'wall-screen',
    objective: 'A post claims warehouse data has been leaked. Find the cause, then choose every safe response.',
    hint: 'Check the wall display in the office, then the three warning icons around it.',
    points: 150,
    penalty: 20,
    npcLine: 'This post is going around and people are already sharing it. What should the team actually do, Commander?',
    npc: 'anjali',
    eyebrow: 'Public post - Warehouse Office',
    headline: 'A social post claims Himalayan Data Vault stock data has been leaked',
    post: {
      handle: '@vault_watch_hdv',
      time: 'posted 6 minutes ago',
      text: 'LEAKED: internal stock sheets from Himalayan Data Vault warehouse. More coming tonight. Share this before they take it down. #dataleak'
    },
    evidenceTitle: 'Trace the cause - inspect all three',
    evidence: [
      { id: 'unlocked', label: 'The unlocked computer', hint: 'Tap to inspect', found: 'The office workstation was left signed in and unlocked while unattended. Anyone walking past - including a visiting driver - could read or photograph what was on screen.' },
      { id: 'social', label: 'The open social account', hint: 'Tap to inspect', found: 'A personal social media account was left signed in on the shared browser, and a photo of the stock board was posted from it by mistake. Background details in workplace photos leak more than people expect.' },
      { id: 'wifi', label: 'The Wi-Fi connection', hint: 'Tap to inspect', found: 'The tablet is joined to an open network named "HDV_Guest_FREE" that is not run by the warehouse. Unknown open Wi-Fi can capture or alter what is sent over it.' }
    ],
    question: 'Select EVERY safe response. All correct actions must be chosen.',
    multi: true,
    choices: [
      { id: 'lock', label: 'Lock the device and sign the account out', correct: true, feedback: 'Locking the screen stops any further access.' },
      { id: 'report', label: 'Report the incident to IT / security straight away', correct: true, feedback: 'Early reporting is what limits the damage - nobody is in trouble for reporting quickly.' },
      { id: 'nowifi', label: 'Disconnect from the unknown "free" Wi-Fi network', correct: true, feedback: 'Leave untrusted networks and use the approved warehouse network or mobile data.' },
      { id: 'share', label: 'Share the post so customers are warned', correct: false, feedback: 'Sharing spreads unverified claims and any data inside them. Communication about an incident comes from the organisation, not from individual staff.' },
      { id: 'reply', label: 'Reply to the account and ask them to take it down', correct: false, feedback: 'Engaging directly tells the poster their claim is working and can make you a target. Let security and communications handle contact.' },
      { id: 'delete', label: 'Delete the browser history to tidy things up', correct: false, feedback: 'That destroys evidence investigators need. Change nothing on the device beyond locking it.' }
    ],
    successTitle: 'Leak contained',
    successText: 'The device is locked, the account signed out, the untrusted network dropped, and security has the incident in hand.',
    failText: 'The response made things worse - the post spread further and evidence was lost.',
    tip: 'Workplace rule: lock your screen every single time you step away, keep personal accounts off shared devices, and never post photos taken inside the warehouse.'
  },

  /* ===================================================================== */
  {
    id: 'm5',
    number: 5,
    type: 'order',
    title: 'SERVER ROOM LOCKDOWN',
    area: 'server',
    hotspot: 'server-console',
    objective: 'Malware warnings are on the server displays. Run the incident-response steps in the correct order.',
    hint: 'Use the red console at the end of the server aisle.',
    points: 200,
    penalty: 20,
    npcLine: 'Commander, the console is throwing warnings and staff are asking what to do. Give us the order and we will follow it exactly.',
    npc: 'rajan',
    eyebrow: 'Active incident - Server Room',
    headline: 'Simulated malware warning on the vault servers',
    briefing: 'Red emergency lighting is active. A server display shows a simulated ransom message and a countdown. Two staff are waiting for your instruction.',
    question: 'Place the four incident-response steps in the correct order.',
    steps: [
      { id: 's1', label: 'Stop interacting with the suspicious content', detail: 'Do not click buttons in the message, do not enter credentials, do not "try things".' },
      { id: 's2', label: 'Disconnect the affected device if it is appropriate to do so', detail: 'Unplug the network cable or turn off Wi-Fi to stop it spreading - but do not power the machine down unless told to.' },
      { id: 's3', label: 'Report the incident to IT / security immediately', detail: 'Use the agreed contact route and say exactly what you saw and when.' },
      { id: 's4', label: 'Preserve evidence - do not delete files or wipe the machine', detail: 'Leave logs, messages and files exactly as they are so the incident can be investigated.' }
    ],
    correctOrder: ['s1', 's2', 's3', 's4'],
    successTitle: 'Lockdown executed correctly',
    successText: 'The infected node is isolated, security has a full report and every piece of evidence is intact. The vault holds.',
    failText: 'The steps were run out of order. Evidence was lost and the simulated infection reached a second system.',
    tip: 'Workplace rule: stop, disconnect if appropriate, report, preserve. Never delete anything and never pay anything - reporting fast is always the right move.'
  }
];

/* ========================================================================= */
/* FINAL BATTLE - CYBER LOCKDOWN                                             */
/* ========================================================================= */

/** Three hidden threats to find in 60 seconds. */
export const HUNT_TARGETS = [
  {
    id: 'h-tailgate',
    area: 'bay',
    label: 'Propped fire door',
    text: 'A side door has been propped open with a pallet. Anyone can walk into the loading bay without a pass - that is how "tailgating" works.'
  },
  {
    id: 'h-printer',
    area: 'office',
    label: 'Documents left on the printer',
    text: 'Printed stock and staff lists are sitting in the output tray. Confidential paperwork left on a shared printer is one of the easiest leaks to cause.'
  },
  {
    id: 'h-rogueap',
    area: 'staff',
    label: 'Rogue Wi-Fi access point',
    text: 'An unknown wireless box has been plugged in behind the lockers, broadcasting a free network. Unrecognised hardware on site must always be reported, never unplugged and pocketed.'
  }
];

/** Five-question final quiz - 20 points each. */
export const QUIZ = [
  {
    q: 'An email demands payment within two hours and tells you not to discuss it with anyone. What is the strongest signal that it is a phishing attempt?',
    a: [
      'It arrived outside working hours',
      'The combination of extreme urgency and being told to keep it secret',
      'It contains a company logo',
      'It was addressed to a shared mailbox'
    ],
    correct: 1,
    why: 'Urgency plus secrecy is designed to stop you checking with a colleague. Logos are trivial to copy and prove nothing.'
  },
  {
    q: 'You find an unlabelled USB drive in the loading bay. What is the safe action?',
    a: [
      'Plug it into a spare terminal to see who owns it',
      'Put it in the lost property box',
      'Hand it to IT / security without connecting it to anything',
      'Format it so it can be reused'
    ],
    correct: 2,
    why: 'Never connect an unknown device. Hand it over unconnected and say where you found it.'
  },
  {
    q: 'Which of these is the strongest workplace password?',
    a: [
      'Warehouse2024!',
      'P@ssw0rd',
      'Yak-Lantern-Frost-7x!Ridge',
      'your date of birth reversed'
    ],
    correct: 2,
    why: 'Length and unpredictability matter most. A long passphrase of unrelated words beats a short "complicated" one.'
  },
  {
    q: 'You are about to leave your workstation for two minutes. What should you do?',
    a: [
      'Nothing - two minutes is too short to matter',
      'Lock the screen every time, however short the break',
      'Turn the monitor off',
      'Ask a colleague to watch it'
    ],
    correct: 1,
    why: 'Locking the screen takes a second and is the single easiest habit that prevents data leaks.'
  },
  {
    q: 'A screen shows a suspicious ransom-style warning. What is the FIRST thing you do?',
    a: [
      'Delete the suspicious files',
      'Stop interacting with it and leave the screen as it is',
      'Restart the computer',
      'Search online for the message text and follow the advice'
    ],
    correct: 1,
    why: 'Stop interacting first. Deleting or restarting destroys evidence and can make the situation worse - report it and let IT respond.'
  }
];

/** Phantom Hacker transmissions - fictional, shown as on-screen text only. */
export const PHANTOM_LINES = {
  intro: 'YOUR VAULT IS ALREADY OPEN, COMMANDER. I ONLY NEED ONE CARELESS CLICK. -- THE PHANTOM',
  taunt1: 'ONE DOOR OPEN. THANK YOU FOR THE ACCESS. -- THE PHANTOM',
  taunt2: 'YOUR STAFF ARE FASTER TO TRUST THAN YOU ARE TO CHECK. -- THE PHANTOM',
  lockdown: 'LOCKDOWN INITIATED. THREE WEAK POINTS REMAIN. FIND THEM OR I WALK OUT WITH EVERYTHING. -- THE PHANTOM',
  defeated: 'SIGNAL LOST. YOUR PEOPLE WERE BETTER TRAINED THAN I EXPECTED. -- THE PHANTOM',
  victory: 'CONNECTION TERMINATED BY HIMALAYAN DATA VAULT DEFENCE GRID.'
};
