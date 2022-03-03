# Messenger-API WebApp

This is the back-end of my independent messenger open source project, based on Node.JS and express frameworks.

[Messenger website (To be...)](https://ymwebapp.com)

[Messenger Front-End Repo Link](https://github.com/yaniv10501/messenger)

## Current functions

* Users States (BLL) and WebSockets trees
* Register
* Login with authorization implemented with JWT auth and refresh tokens
* Friend requests
* Adding profile image
* Notify users without profile image to upload and don't disturb feature
* Creating groups
* Sending messages
* Unread messages count
* Dynamic content loading
* User typing and online status
* Notifications system for new messages and friend requests

## Features implementation

### Users States (BLL) and WebSockets trees

Every registered user get a node in the Balanced AVL Users Tree, when the user log in a node is added to the WebSocket AVL Tree and when a user log out the node is removed from the tree.
U Can see the implementaion of the AVL Tree and Nodes at ./utils/(AvlTree.js || DoubledBlanacedNode.js).

For every user, there is a state of the user info, chats, friends/requests/pending, messages, notifications, online status and dont disturb list.

The user state contains the init data for each user, and when the user loads more data it goes from the DB to the website (For some states like chats and messages the state update too and then clean up to default values).

BLL improves loading time for init data as the server doesn't need to access the DB as well as for updates because the user doesn't have to wait for DB to update (it can happen in sync because states don't use as much async functions).

### Register, Login, and Authorization

Upon a valid Register request a new user is created both in mongo and BLL states with default values. Upon a valid login request a node is added to the WebScokets tree and the user state online status is set to online.

To maintain sessions the JWT token and the refresh token are being saved as cookies and sent with every request, if the JWT is expired, a refresh token is used to aquire a new JWT with a new refresh token.

Used refresh tokens are saved in mongo to avoid double use of single refresh token, JWT can be used as long as it is not expired.

### Friend requests

Friend requests and approves are being transferred with a web-socket message to the other user (if he is connected to his socket).

Every friend request need to be approved by the other user, after the request is approved both users can start a chat or add each other to groups.

### Adding profile image, notify users without profile image and don't disturb feature

Every user can add a profile image so other users can see, Images can be jpeg, jpg or png type, and every image is being saved in the server.

Users without a profile image visiting the main page will get a popup promoting them to upload an image profile, The user can upload a new image directly form the popup, close it and get notified next time he visit main page, or check the "Don't remind" checkbox to not get notified again.

### Creating groups

Every user can create a groups with the "New group" button in the chats page.

A user always have an "Empty group" in mongo and BLL state to store a new id for the new group, after initing a new group the id of the empty group changes.

Groups have a name, image and friends list, and the Group popup is being validated to make sure a group have a name and at least one friend, group image is not mandatory.

In group chat, every message (excluding the logged user messages) is being marked with the name of the user who sent it.
You can also see witch user is typing at a giving moment.

### Sending messages and unread messages count

Messages are being transferred with a web-socket message to the other user/s (if he/they is/are connected to his/their socket).

When a user send enter a chat the unread count is set to 0, when a user receive a message if he is not currently in the chat the unread count will increase by 1, else it will remain 0.

### Dynamic content loading

Friends lists (More, Pending and Requests), chats list and chat messages list are being loaded from the BLL to the website so maintain performance.

The lists of Chats, Friends/Request/Pending contain 20 items, the messages list contain 50 items.

When a more request is being sent, more item are being sent directly to the client, for chats and messages the state updates too.

When a friend is being added, a new chat is created for both users in state and mongo. when a message is sent in a chat, the chat item moves to the top of the array to maintain correct order of the chats list without sorting it upon requests.

### User typing and online status

When a user log in he is being added to the sockets list with a new socket connection, when a user connect to his socket his online state is set to true and his friends can see it in the chat.

When a user disconnect from his socket his online state is being set to false and the Date.now() value is being saved too.

The "Was online" value is being calculated with the difference between offline Date.now() and current Date.now().
In the function setLastSeenTime (./utils/setLastSeenTime.js), there are consts for the MS in a minute, hour, dat and a week.

If the difference is higer then a week MS then return the date (dd/mm/yyyy),

If the difference is higer then a day ms, if the current day string is equal to offline day string return the date (dd/mm/yyyy), else calculate and return days count with rounding the equation of (time difference / day MS),

If the difference is higer then a hour ms, calculate and return hours count with rounding the equation of (time difference / hour MS),

If the difference is higer then a minute ms, calculate and return minute count with rounding the equation of (time difference / minute MS),

When a user type in a chat, socket messages are being sent to online friends in the chat friend lists.

### Notifications system for new messages and friend requests

When a new message or friend request is being procced at the server, a new notification is being set for the other user/s in the BLL state and in the mongoDB.

## In dev

* Mute chat
* Deny friend request
* Block user
* Notifications decrease unseen count and delete notifications from list
* Delete chats for user, and delete user messages for both users in chat or all group members
* Modify group image
* Modify group friends (Add/Delete)
* Group admin features
* Profile page for user
* End to end messages encryption

## Contribute

This is an open source project, every contribution or feedback will be appreciated !
