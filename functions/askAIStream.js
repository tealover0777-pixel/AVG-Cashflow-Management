const cors = require('cors')({ origin: true });

exports.askAIStream = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send('Unauthorized');
      }
      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      // Extract parameters
      const bodyData = req.body.data || req.body;
      const { query, selectedTenantId } = bodyData;
      
      if (!query) {
        return res.status(400).send('Missing query');
      }

      // Role Logic
      const uid = decodedToken.uid;
      const callerRole = decodedToken.role || 'R10001';
      const callerTenantId = decodedToken.tenantId || '';
      const isGlobal = decodedToken.isGlobal === true || decodedToken.email === "kyuahn@yahoo.com" || callerRole === "Super Admin" || callerRole === "L2 Admin" || (callerRole >= 'R10006' && callerRole <= 'R10010');
      const isTenantUser = !isGlobal && (callerRole >= 'R10002' && callerRole <= 'R10005');
      const isMember = !isGlobal && !isTenantUser && callerRole === 'R10001';

      let resolvedTenantId = null;
      if (isGlobal) {
        if (!selectedTenantId || selectedTenantId === 'CONSOLIDATED' || selectedTenantId === 'ALL') {
          return res.status(400).send("Consolidated view not supported for AI analysis.");
        }
        resolvedTenantId = selectedTenantId;
      } else {
        if (!callerTenantId) return res.status(403).send("No tenant ID");
        resolvedTenantId = callerTenantId;
      }

      const db = admin.firestore();
      let contactId = null;
      if (isMember) {
        contactId = await resolveContactId(db, resolvedTenantId, uid);
        if (!contactId) return res.status(403).send("No contact profile");
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      
      // Tool to let Gemini request specific data
      const tools = [{
        functionDeclarations: [{
          name: "fetch_data",
          description: "Fetch required financial records for the tenant",
          parameters: {
            type: "OBJECT",
            properties: {
              categories: {
                type: "ARRAY",
                description: "Array of categories to fetch. Allowed: deals, investments, ledger, paymentSchedules, contacts",
                items: { type: "STRING" }
              }
            },
            required: ["categories"]
          }
        }]
      }];

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", tools });
      const chat = model.startChat({
         systemInstruction: `You are an expert financial analysis assistant for AVG Cashflow Management. 
Your task is to analyze the user's query and if you need data, call fetch_data with the exact categories needed.
Only fetch what is necessary. Once you have the data, answer the user professionally.
Do not mention user IDs or internal document paths.`
      });

      const result = await chat.sendMessageStream(query);
      
      let functionCall = null;
      for await (const chunk of result.stream) {
        if (chunk.functionCalls && chunk.functionCalls().length > 0) {
          functionCall = chunk.functionCalls()[0];
        }
        try {
          const t = chunk.text();
          if (t) res.write(`data: ${JSON.stringify({ text: t })}\n\n`);
        } catch(e) {}
      }

      if (functionCall) {
        const categories = functionCall.args.categories || ["deals", "investments", "ledger", "paymentSchedules", "contacts"];
        let analysisData = {};
        
        // Optimize fetching based on categories
        const tasks = [];
        if (isMember) {
           // For member, just fetch all member data
           analysisData = await fetchMemberData(db, resolvedTenantId, contactId);
        } else {
           if (categories.includes("deals")) tasks.push(db.collection(`tenants/${resolvedTenantId}/deals`).limit(100).get().then(s => analysisData.deals = s.docs.map(d=>d.data())));
           if (categories.includes("investments")) tasks.push(db.collection(`tenants/${resolvedTenantId}/investments`).limit(200).get().then(s => analysisData.investments = s.docs.map(d=>d.data())));
           if (categories.includes("ledger")) tasks.push(db.collection(`tenants/${resolvedTenantId}/ledger`).limit(500).get().then(s => analysisData.ledger = s.docs.map(d=>d.data())));
           if (categories.includes("paymentSchedules")) tasks.push(db.collection(`tenants/${resolvedTenantId}/paymentSchedules`).limit(500).get().then(s => analysisData.paymentSchedules = s.docs.map(d=>d.data())));
           if (categories.includes("contacts")) tasks.push(db.collection(`tenants/${resolvedTenantId}/contacts`).limit(300).get().then(s => analysisData.contacts = s.docs.map(d=>d.data())));
           await Promise.all(tasks);
        }

        const followUp = await chat.sendMessageStream([{
          functionResponse: {
            name: functionCall.name,
            response: analysisData
          }
        }]);

        for await (const chunk of followUp.stream) {
          try {
            const t = chunk.text();
            if (t) res.write(`data: ${JSON.stringify({ text: t })}\n\n`);
          } catch(e) {}
        }
      }

      res.end();
    } catch (error) {
      console.error("askAIStream Error:", error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  });
});
