// get the userIds of all friends of a given userId
let twitterFetchFriendIds = (client, endpoint, params, results) => {
  return new Promise( async (resolve, reject) => {
    try {
      let response = await client.get(endpoint, params);
      // add ids to friends for that user
      response.ids.forEach(user => {
        results.push(user);
      });
      // make API call again if next cursor !== 0
      let nextCursor = response.next_cursor_str;
      if (nextCursor !== "0") {
        params.cursor = nextCursor;
        results = results.concat(await twitterFetchFriendIds(client, endpoint, params, []));
        resolve(results);
      } else {
        resolve(results);
      } 
    } catch(error) {
      console.log('error in twitterFetchFriendIds', error);
      reject(error);
    }
  });
}

// get fully hydrated user objects for a given list of ids
let twitterFetchUserObjects = (client, endpoint, ids, index, maxObjects, results) => {
	return new Promise( async (resolve, reject) => {
	    try {
	      let idsInput = ids.slice(index, index + maxObjects).join(',');
	      let params = {
	      	'user_id': idsInput
	      }
	      let response = await client.post(endpoint, params);
	      // add ids to friends for that user
	      response.forEach(user => {
	        results.push(user);
	      });
	      // make API call again if not all users retrieved
	      if (index + maxObjects < ids.length) {
	      	index += maxObjects;
	        results = results.concat(await twitterFetchUserObjects(client, endpoint, ids, index, maxObjects, []));
	        resolve(results);
	      } else {
	        resolve(results);
	      } 
	    } catch(error) {
	      console.log('error in twitterFetchUserObjects', error)
	      reject(error);
	    }
	});
}

// function will invoke two above helper functions to return all friend user objects for a given userId
let getFriends = (client, userId) => {
	return new Promise((resolve, reject) => {
		let friendsEndpoint = 'friends/ids'; 
		let friendParams = {
			'user_id': userId,
			'count': 5000,
			'cursor': -1,
			'stringify_ids': true
		};
		// for twitterFetchUserObjects
		let userObjectEndpoint = 'users/lookup';
		let maxObjects = 100;
		twitterFetchFriendIds(client, friendsEndpoint, friendParams, [])
		.then(ids => twitterFetchUserObjects(client, userObjectEndpoint, ids, 0, maxObjects, []))
		.then(users => resolve(users))
		.catch(err => {
			console.log('error in getFriends', err);
			reject(err)
		})
	})
}

module.exports = getFriends;