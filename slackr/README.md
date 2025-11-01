## 0. Change Log
1021 - Update the pre-commit script and update 2.2.2 on defining the way to trigger the create channel button

# Assessment 3 - Vanilla JS: Slackr

[Please see course website for full spec](https://cgi.cse.unsw.edu.au/~cs6080/NOW/assessments/assignments/ass3)

This assignment is due 8pm on Friday 31st October.

**Please run `./util/setup.sh` in your terminal before you begin. This will set up some checks in relation to the "Git Commit Requirements".**

**Pipelines will not display the results of line checks for this assignment**

## 2. The Task

Your task is to build a frontend for a UNSW rip-off version of the popular messaging tool [Slack](https://slack.com/). If you haven't used this application before (or similar applications like Discord, Teams), we would recommend creating your own slack workspace to place around with the tool.

UNSW's rip-off of slack is called "Slackr". However, you don't have to build the entire application. You only have to build the frontend. The backend is already built for you as an express server built in NodeJS (see section 3.2).

Instead of providing visuals of what the frontend (your task) should look like, we intend are providing you with a number of clear and short requirements about expected features and behaviours.

The requirements describe a series of **screens**. Screens can be popups/modals, or entire pages. The use of that language is so that you can choose how you want it to be displayed. A screen is essentially a certain state of your web-based application.

**Important Note**: Throughout this specification, certain elements are required to be declared with specific DOM element types, IDs, and classes. Please follow these requirements carefully as they are essential for testing and functionality.

### 2.1. Milestone 1 - Registration & Login (15%)

This focuses on the basic user interface to register and log in to the site.

#### 2.1.1. Login
 * When the user isn't logged in, the site shall present a login form that contains:
   * an email field (text) [`DOMElement` with id: `login-email`]
   * a password field (password) [`DOMElement` with id: `login-password`]
   * submit button to login [`DOMElement` with id: `login-submit`]
 * When the submit button is pressed, the form data should be sent to `POST /auth/login` to verify the credentials. If there is an error during login an appropriate error should appear on the screen.

#### 2.1.2. Registration
 * When the user isn't logged in, the login form shall provide a link/button [`DOMElement` with id: `register-link`] that opens the register form. The register form will contain:
   * an email field (text) [`DOMElement` with id: `register-email`]
   * a name field (text) [`DOMElement` with id: `register-name`]
   * a password field (password) [`DOMElement` with id: `register-password`]
   * a confirm password field (password) - not passed to the backend, but an error should be thrown on submit if it doesn't match the other password [`DOMElement` with id: `register-password-confirm`]
   * submit button to register [`DOMElement` with id: `register-submit`]
 * When the submit button is pressed, if the two passwords don't match the user should receive an error popup. If they do match, the form data should be sent to `POST /auth/register` to verify the credentials. If there is an error during registration an appropriate error should appear on the screen.

#### 2.1.3. Error Popup
 * Whenever the frontend or backend produces an error, there shall be an error popup [`DOMElement` with id: `error-body`] on the screen with a message (either a message derived from the backend error response, or one meaningfully created on the frontend).
 * This popup can be closed/removed/deleted by pressing an "x" or "close" button. [`DOMElement` with id: `error-close`]

#### 2.1.4. Home Page

 * Once a user has registered or logged in, they should arrive on the home page. [`DOMElement` with id: `dashboard-container`]
 * For now, the home page will be a blank screen that contains only a "logout" button visible at all times. [`DOMElement` with id: `logout-button`]
 * When this logout button is pressed, it removes the token from the state of the website (e.g. local storage) and then sends the user back to the login screen.

### 2.2. Milestone 2 - Creating and viewing channels (10%)

Milestone 2 focuses on creating **channels**, and viewing the basic channel screen layout for a single channel.

#### 2.2.1 Viewing a list of channels
 * The application should present a list [`DOMElement` with id: `channel-list`] of all public channels created. This will be visible on every screen for a logged-in user.
 * The user should also be able to see a list of all private channels they have joined. This will be visible on every screen for a logged-in user.
 * The two types of channels should be distinguishable visually.
 * Selecting a channel [`DOMElement` with class: `channel-container`] should take the user to the single channel screen. This single channel screen should show the channel's messages and other features (implemented in `2.3`).
 * If a user has logged in, but has not selected a channel yet, there are no rules around what the main body of the screen should display (reminder: the list of channels should still be visible somewhere, in some form).

#### 2.2.2 Creating a new channel
 * Users should be able to create a new channel via some kind of form.
 * The trigger [`DOMElement` with id: `create-channel-button`] to display the form [DOMElement with id: create-channel-container] should be accessible on dashboard screen without any clicks.
 * Users should be able to enter the name [`Input` with id: `create-channel-name`], an optional description [`DOMElement` with id: `create-channel-description`], public/private channel type [`Input` with `checkbox` type and id: `create-channel-is-private`], and a submit button [`DOMElement` with id `create-channel-submit`].
 * **Note: the description should be optional for the user but the backend requires a description.**

#### 2.2.3 Viewing and editing channel details
 * When viewing a single channel screen, certain information should be accessible/visible immediately.
 * This information [`DOMElement` with id: `channel-details-container`] includes the name of the channel, description, public/private setting, creation timestamp (as a time/date not as an ISO string, flexible to whatever you think is user-friendly), and name of the creator of the channel.
 * Users should be able to edit the channel's name and description in some way. Channel details can only be edited by users who are in the channel.
 * If the user is not a member of the channel, they do not need to see the channel details, but should be given a way to join the channel.
 * If the user is a member of the channel, there should be an option to leave the channel.

### 2.3. Milestone 3 - Channel messages (18%)

Milestone 3 focuses on the display and interaction of messages on a single channel screen.

#### 2.3.1 Viewing channel messages
 * The channel's messages can be viewed on each single channel screen.
 * Each message [`DOMElement` with class: `message-container`] should display the sender's name and profile photo, and message timestamp (as a time/date not as an ISO string, flexible to whatever you think is user-friendly).
 * Message should be displayed in reverse-chronolgoical order (Newest comes to the bottom).
 * If the user has no profile photo, the frontend should use a default image.

#### 2.3.2 Message pagination
 * Users can page between sets of messages in the channel.
 * **Note: you can ignore this if you properly implement infinite scroll in milestone 6.**

#### 2.3.3 Sending messages
 * Users can send new messages from the single channel screen via an input field [`Input` or `Textarea` with id: `message-input`] and a send button [`DOMElement` with id: `message-send-button`] with no click.
 * Once messages are sent, the channel messages should automatically update without requiring a page reload/refresh.
 * The frontend should validate the message so that empty strings or messages containing only whitespace cannot be sent.

#### 2.3.4 Deleting messages
 * Users can delete their own messages they see displayed from the single channel screen via a delete button [`DOMElement` with class: `message-delete-button`].
 * Once messages are deleted, the channel messages should automatically update without requiring a page reload/refresh.

#### 2.3.5 Editing messages
 * Users can edit their own messages they see displayed from the single channel screen via an edit button [`DOMElement` with class: `message-edit-button`].
 * Once messages are edited, there should be an indication that they have been edited, as well as the timestamp (as a time/date not as an ISO string, flexible to whatever you think is user-friendly).
 * The frontend should validate the message so that a user cannot edit a message to the same existing message.

#### 2.3.6 Reacting to messages
 * Users can react and unreact to messages.
 * This is reflected on the screen
 * You should provide at least 3 different reactions.
 * Reactions must be UTF-8 emojis.

#### 2.3.7 Pinning messages
 * Users can pin and unpin messages.
 * There should be a way for users to view all the channel's pinned messages at once. If the user is only on the first page of messages, but there is a pinned message on the third page, they should not have to navigate to the third page to see it.

### 2.4. Milestone 4 - Multi-user interactivity (10%)

Milestone 4 focuses on the interactions that come from having multiple users in the system.

#### 2.4.1 Inviting users to a channel
 * Users should be able to show a modal form [`DOMElement` with id: `channel-invite-container`] via an invite button [`DOMElement` with id: `invite-user-button`] to add other users to a channel from a modal.
 * Users are visually identified by their name [`DOMElement` with class: `invite-member-name`].
 * List should be showing users who doesn't joined the channel yet.
 * Users should be able to select multiple users to add at the same time via a checkbox [`Input` with `checkbox` type and class: `invite-member-checkbox`].
 * When selecting the user(s), they must be displayed in alphabetical order of their name.
 * There should be a button in the modal to submit the invitation [`DOMElement` with id: `invite-submit-button`].

#### 2.4.2 User profiles
 * Within a single channel screen, if you click on a users' name [`DOMElement` with class: `message-user-name`] on a given message, it should display their profile screen [`DOMElement` with id: `profile-container`].
 * Their profile photo, name, bio, and email should be displayed on this screen.
 * [`DOMElement` with id: `profile-image`, `profile-name`, `profile-bio` and `profile-email` respectively]

#### 2.4.3 Viewing and editing user's own profile
 * On all logged in screens, there must be a way for the user to view their own profile screen [`DOMElement` with id: `avatar-label` or `avatar-image`, depedning on how to display the current user in dashboard page].
 * On a user's own profile screen [`DOMElement` with id: `own-profile-container`, or reusing `profile-container`], they should also be able to see the field that allows them to enter a new password (they cannot see their current).
 * On a user's own profile screen, they should be able to toggle between viewing the new password they're entering in either plain text or hidden as a string of asterisks/dots of the correct length. It is hidden by default.
 * On a user's own profile screen, they can update their own profile, including name, bio, email, and password (as described above).
 * On a user's own profile screen, they should be able to upload and change their profile photo.

### 2.5. Milestone 5 - Photos in channels (7%)

Milestone 5 focuses on being able to upload and send photos as part of messages in a single channel screen.

#### 2.5.1 Sending photos in channels
 * Users should be able to upload and send photos in a single channel screen using the `POST /message/{channelId}`.
 * A message that contains an image [`DOMElement` with class: `message-image`] does not include text as well.

#### 2.5.2 Viewing photos in channels
 * Photos in the channel messages should be displayed as small thumbnails, with the option to click to enlarge the image in a modal.
 * In the modal, there should be arrow buttons allowing the user to view other images sent in the channel.

### 2.6. Milestone 6 - Challenge components (5%)

Milestone 6 focuses on some harder components that are designed to start to separate out HD (High Distinction) students from one another. These features require independent learning and research.

#### 2.6.1 Infinite Scroll
 * Instead of pagination, users can infinitely scroll through messages. For infinite scroll to be properly implemented, you need to progressively load posts as you scroll.
 * Once users have reached the end of a set of messages, while the fetch is happening, they should see a message or icon indicating that the next set of messages are currently being fetched.

#### 2.6.2 Push notifications
 * Users can receive push notifications when another user posts to a channel they have joined.
 * To know whether someone or not has made a post, you must "poll" the server (i.e. intermittent requests, maybe every second, that check the state).

 _Polling is very inefficient for browsers, but can often be used as it simplifies the technical needs on the server._

 _No course assistance in lectures will be provided for this component, you should do your own research as to how to implement this. There are extensive resources online._

### 2.7. Milestone 7 - Extra challenge components (5%)

Milestone 7 focuses on some even harder components that are designed to start to separate out HD (High Distinction) students from one another. These features require independent learning and research.

#### 2.7.1 Offline access
 * Users can access the most recent channel they've loaded even without an internet connection.
 * Cache information from the latest channel in local storage in case of connection outages.
 * When the user tries to interact with the website at all in offline mode (e.g. send message, react) they should receive errors.

 *No course assistance will be provided for this component, you should do your own research as to how to implement this.*

#### 2.7.2 Fragment based URL routing
Users can access different screens using URL fragments:
```
 	* `/#channel={channelId}` to access the channel screen of the particular channelId
	* `/#profile` to view the authorised user's own profile
	* `/#profile={userId}` to view the profile of the user with the particular userId
```

_No course assistance will be provided for this component, you should do your own research as to how to implement this._

### 2.8. Bonus Marks (5%)

An extra 5% of the assignment can be attained via bonus marks, meaning a maximum mark of 105/100. Any bonus marks that extend your ass2 mark above 100% will bleed into other assignment marks, but cannot contribute outside of the 80% of the course that is allocated for assignment marks.

Your bonus feature(s) can be anything. You just have to think of something that could make your web app stand out in some minor or major way. Simple examples would include just making sure that your user interface and user experience stands out amongst other students, maybe through some user testing.

You could also add extra features, such as some additional frontend form validations - the possibilities are limitless.

If you do implement a bonus feature, describe the feature and its details in `bonus.md` in the root directory of this repository.