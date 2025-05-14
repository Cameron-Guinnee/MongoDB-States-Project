const State = require('../model/State');
const statesJson = require('../model/states.json');
const jsonMessage = require('../middleware/jsonMessage');
const res = require('express/lib/response');
const getStateName = require('../middleware/getStateName');


const getAllStates = async (req, res) => {
     let mongoStates = await State.find();
     if (!mongoStates) return res.status(204).json({ 'message': 'No states found.' });
    // 1) start with a fresh deep‑copy of the 50 static states
    let jsonStates = JSON.parse(JSON.stringify(statesJson));

    // 2) for each DB record merge in its funfacts
    mongoStates.forEach(dbRec => {
      if (Array.isArray(dbRec.funfacts) && dbRec.funfacts.length > 0) {
        const idx = jsonStates.findIndex(s => s.code === dbRec.stateCode);
        if (idx > -1) {
          jsonStates[idx].funfacts = dbRec.funfacts;
        }
      }
    });

    // 3) support ?contig=true (drop AK, HI) or ?contig=false (only AK, HI)
    if (req.query.contig === 'true') {
      jsonStates = jsonStates.filter(s => s.code !== 'AK' && s.code !== 'HI');
    } else if (req.query.contig === 'false') {
        jsonStates = jsonStates.filter(s => s.code === 'AK' || s.code === 'HI');
    }

    return res.json(jsonStates);
}


const getState = async (req, res) => {
  if (!req?.params?.state) {
    return res.status(400).json({ 'message': 'State code required.' });
  }
  const code = req.params.state.toUpperCase();

  // first: look up in the static JSON list
  const staticState = statesJson.find(s => s.code === code);
  if (!staticState) {
    return res.status(400).json({ 'message': 'Invalid state abbreviation parameter' });
  }

  // deep‑clone so we don't mutate the module’s array
  let jsonState = JSON.parse(JSON.stringify(staticState));

  // then merge in any funfacts from Mongo
  const dbState = await State.findOne({ stateCode: code }).exec();
  if (dbState && Array.isArray(dbState.funfacts) && dbState.funfacts.length > 0) {
    jsonState.funfacts = dbState.funfacts;
  }

  return res.json(jsonState);
}

const getFunfact = async (req, res) => {
  // 1) State-code must be present 
  const { state } = req.params; 
  if (!state)
  {
    return res.status(400).json({ 'message': 'State code required.'}); 
  }
  
  // 2) Normalize & validate against static JSON 
  const code = state.toUpperCase(); 
  const staticState = statesJson.find(s => s.code === code);
  if (!staticState)
  {
    return res.status(400).json({ 'message': 'Invalid state abbreviation parameter'}); 
  }
  
  // 3) Gather fun-facts: static first...
  let funfacts = Array.isArray(staticState.funfacts) 
    ? [...staticState.funfacts] 
    : [];
  
  // ...and then override with any in Mongo
  const dbState = await State.findOne({ stateCode: code }).exec();
  if (dbState && Array.isArray(dbState.funfacts) && dbState.funfacts.length)
  {
    funfacts = dbState.funfacts;
  }
  
  // 4) If still no funfacts, then 404 + exact message 
  if (!funfacts.length)
  {
    const name = getStateName(code); 
    return res.status(404).json({ 'message': `No Fun Facts found for ${name}`});
  }
  
  // 5) Otherwise, pick one at random and return 
  const randomIndex = Math.floor(Math.random()*funfacts.length);
  return res.json({ funfact: funfacts[randomIndex]});
}


const getCapital = async (req, res) => {
    jsonMessage(req, res, 'capital');
}

const getNickname = async (req, res) => {
    jsonMessage(req, res, 'nickname');
}

const getPopulation = async (req, res) => {
    jsonMessage(req, res, 'population');
}

const getAdmission = async (req, res) => {
    jsonMessage(req, res, 'admission');
}


const createNewFunfacts = async (req, res) => {
  // 1) Make sure we got a state parameter
  if (!req?.params?.state) {
    return res.status(400).json({ message: 'State code required.' });
  }
  const code = req.params.state.toUpperCase();

  // 2) Does this code even exist in our static JSON?
  const staticState = statesJson.find(s => s.code === code);
  if (!staticState) {
    return res.status(400).json({ message: `No state matches code ${req.params.state}.` });
  }

  // 3) Fetch (or create) our Mongo record
  let state = await State.findOne({ stateCode: code }).exec();
  if (!state) {
    state = new State({ stateCode: code, funfacts: [] });
  }

  // 4) Validate request body
  if (!req.body.funfacts) {
    return res.status(400).json({ message: 'State fun facts value required' });
  }
  if (!Array.isArray(req.body.funfacts)) {
    return res.status(400).json({ message: 'State fun facts value must be an array' });
  }

  // 5) Append the new facts, save, and return the document
  state.funfacts.push(...req.body.funfacts);
  const result = await state.save();
  return res.json(result);
};


// PATCH
const updateFunfact = async (req, res) => {
  // 1) state param must exist
  if (!req?.params?.state) {
    return res.status(400).json({ message: 'State code required.' });
  }
  const code = req.params.state.toUpperCase();

  // 2) validate against static JSON
  const staticState = statesJson.find(s => s.code === code);
  if (!staticState) {
    return res.status(400).json({ message: `No state matches code ${req.params.state}.` });
  }

  // 3) pull index & funfact from body
  const { index, funfact } = req.body;
  if (index === undefined || typeof index !== 'number') {
    return res.status(400).json({ message: 'State fun fact index value required' });
  }
  if (!funfact || typeof funfact !== 'string') {
    return res.status(400).json({ message: 'State fun fact value required' });
  }

  // 4) human‑friendly name
  const stateName = getStateName(code);

  // 5) fetch the DB record
  const stateRec = await State.findOne({ stateCode: code }).exec();

  // 6) no record _or_ empty funfacts ⇒ error
  if (!stateRec?.funfacts || stateRec.funfacts.length === 0) {
    return res.status(400).json({ message: `No Fun Facts found for ${stateName}` });
  }

  // 7) index out of range ⇒ error
  if (index < 1 || index > stateRec.funfacts.length) {
    return res.status(400).json({ message: `No Fun Fact found at that index for ${stateName}` });
  }

  // 8) OK, do the update and save
  stateRec.funfacts[index - 1] = funfact;
  const result = await stateRec.save();
  return res.json(result);
};

// DELETE
const deleteFunfact = async (req, res) => {
  // 1) Make sure we got a state parameter
  if (!req?.params?.state) {
    return res.status(400).json({ message: 'State code required.' });
  }
  const code = req.params.state.toUpperCase();

  // 2) Validate against our static JSON
  const staticState = statesJson.find(s => s.code === code);
  if (!staticState) {
    return res
      .status(400)
      .json({ message: `No state matches code ${req.params.state}.` });
  }

  // 3) Fetch (or create in‑memory) our Mongo record
  let stateRec = await State.findOne({ stateCode: code }).exec();
  if (!stateRec) {
    // not in DB yet → treat as blank
    stateRec = new State({ stateCode: code, funfacts: [] });
  }

  // 4) Prep for error messages
  const stateName = getStateName(code);
  const { index } = req.body;

  // 5) Missing index in body?
  if (index === undefined) {
    return res
      .status(400)
      .json({ message: 'State fun fact index value required' });
  }

  // 6) No funfacts at all?
  if (!stateRec.funfacts?.length) {
    return res
      .status(400)
      .json({ message: `No Fun Facts found for ${stateName}` });
  }

  // 7) Index out of range?
  if (index < 1 || index > stateRec.funfacts.length) {
    return res
      .status(400)
      .json({ message: `No Fun Fact found at that index for ${stateName}` });
  }

  // 8) All good -> delete and save
  stateRec.funfacts.splice(index - 1, 1);
  const result = await stateRec.save();
  return res.json(result);
};

module.exports = { 
    getAllStates,
    getState,
    getCapital,
    getNickname,
    getPopulation,
    getAdmission,
    getFunfact,

    createNewFunfacts,
    updateFunfact,
    deleteFunfact
};
