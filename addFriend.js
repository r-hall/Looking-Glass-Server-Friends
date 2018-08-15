const Friends = require('./db.js').Friends;

const addFriend = (client, friendId, viewerId, oldFriends) => {
	return new Promise( async (resolve, reject) => {
        try {
            let endpoint = 'friendships/create'; 
            let friendParams = {
                'user_id': friendId
            };
            let friend = await client.post(endpoint, friendParams);
            let query = {};
            query['id'] = viewerId;
            let newFriend = {
                'id_str': friend.id_str,
                'name': friend.name,
                'screen_name': friend.screen_name,
                'profile_image_url_https': friend.profile_image_url_https,
                'followers_count': friend.followers_count,
                'likes': 0,
                'description': friend.description,
                'verified': friend.verified
            }
            oldFriends.push(newFriend);
            let updateObject = {
                'friends': oldFriends
            };
            await Friends.findOneAndUpdate(query, updateObject);
            resolve(JSON.stringify(friend));
        } catch(err) {
            console.log('ERROR in addFriend', err);
        }
    });
}

module.exports = addFriend;