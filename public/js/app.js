var lastScrolled = 0;
var currUser = {};
$(document).ready(function() {
  auth.stateChanged();
  onStart();
});

function nodeTest() {
  $.ajax({
    type: 'POST',
    url: 'http://localhost:3000/getFeed'
  });
}

/*

Routing

For now, routing is built using client side tech. We'll probably end up moving the logic server side to make
the load easier on the browser, but it's small enough not to matter for now.

*/

var auth = {
  stateChanged: function() {
    firebase.auth().getRedirectResult().then(function(result) {
      if (result.credential) {
        var token = result.credential.accessToken;
      }

      // The signed-in user info.
      //
      currUser = firebase.auth().currentUser;

      //If a user matches, give the onboarding flow. Else go to feed.
      //
      var isUser = firebase.database().ref('/users/' + currUser.uid).once('value').then(function(snapshot) {
        if (snapshot.val() == null) {
          mainCtrl.pullUpModal('signinContinue');
        }
      });
    })
    .catch(function(error) {
      // Handle Errors here.
      //
      var errorCode = error.code;
      var errorMessage = error.message;

      // The email of the user's account used.
      //
      var email = error.email;

      // The firebase.auth.AuthCredential type that was used.
      //
      var credential = error.credential;
    });
  },

  google: function() {
    $('.modal-signinContinue').attr('data-provider', 'google');
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithRedirect(provider);
  },

  facebook: function() {
    $('.modal-signinContinue').attr('data-provider', 'facebook');
    var provider = new firebase.auth.FacebookAuthProvider();
    firebase.auth().signInWithRedirect(provider);
  },

  twitter: function() {
    $('.modal-signinContinue').attr('data-provider', 'twitter');
    var provider = new firebase.auth.TwitterAuthProvider();
    firebase.auth().signInWithRedirect(provider);
  },

  createAccount: function(user, name, email) {
    user.updateProfile({displayName: name});
    user.updateEmail(email);
    var provider = user.providerData[0].providerId;

    if (user.photoUrl) {
      var data = {
        provider: provider,
        email:email,
        name:name,
        photoUrl: photoUrl,
      }
    }

    else {
      var data = {
        provider: provider,
        email:email,
        name:name,
      }
    }

    var key = firebase.auth().currentUser.uid;
    var update = {};
    update['/users/' + key] = data;

    console.log(update);
    return firebase.database().ref().update(update);
  },

  signout: function() {
    firebase.auth().signOut().then(function() {
      // Sign-out successful.
    }, function(error) {
      // An error happened.
    });
  }
}

function onStart() {
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      // User is signed in.
      //
      console.log('User signed in as:' + user.uid);
      $('body').addClass('signedIn');
      currUser = firebase.auth().currentUser;
      $('.nav .profileImg').attr('src', currUser.photoURL);
      $('.feed-quickpost-input-post__img').attr('src', currUser.photoURL);
      routes();
    } else {
      // No user is signed in.
      //
      console.log('User not signed in.');
      $('body').addClass('signedOut');
      currUser = {};
    }
  });

  function routes() {
    var routes = {
      '/' : {
        on: function() {view.feed.show()}
      },
      '/post' : {
        '/:updateId' : {
          on: function(updateId) {view.post.show(updateId)}
        }
      },

      '/write-post' : {
        on: function() {view.newPost.show()}
      },

      '/user/:userId' : {
        on: function() {view.profile.show()}
      },

      '/welcome' : {
        on: function() {view.onboarding.show()}
      }
    }

    var router = Router(routes);
    router.init('/');
  }

  //Here we bind functions to buttons
  //
  $('body').on('keypress', '.hasLabel', function(e) {
    hideLabel(e.currentTarget);
  });

  $('body').on('click', '.nav-action__signin', function(e) {
    mainCtrl.pullUpModal('signin');
  });

  $('body').on('click', '.modal-bkg', function(e) {
    mainCtrl.removeCurrModal();
  });

  $('body').on('click', '.socialLogin__google', function(e) {
    auth.google();
  });

  $('body').on('click', '.socialLogin__twitter', function(e) {
    auth.twitter();
  });

  $('body').on('click', '.socialLogin__facebook', function(e) {
    auth.facebook();
  });

  $('body').on('click', '.feed-quickpost-input-post__send', function(e) {
    mainCtrl.create.post();
  });

  $('body').on('click', '.modal-signing-createAccount', function(e) {
    var email = $('.modal-signinContinue').find('.email').val();
    var name = $('.modal-signinContinue').find('.name').val();

    auth.createAccount(currUser, name, email);
    mainCtrl.removeCurrModal();
    view.feed.show();
  });

  window.addEventListener('scroll', function(e) {
    var view = $('html').attr('data-view');

    var scrollTop = $(window).scrollTop();
    var elementOffset = $('#section__' + view + ' .section-rightColumn').offset().top;
    var fromTop = (elementOffset - scrollTop);

    switch (view) {
      case 'newPost':
        followOnScroll('#section__newPost .section-rightColumn', fromTop);
        break;

      case 'post':
        var velocity = scrollTop - lastScrolled;
        lastScrolled = scrollTop;

        var initLocation = $('.post-author').height() + $('.post-cover').height();
        console.log(scrollTop)

        if (fromTop <= 76 && velocity > 0) {
          followOnScroll('#section__' + view + ' .section-rightColumn', fromTop);
        }

        else if (scrollTop <= initLocation && velocity < 0) {
          unfollowOnScroll('#section__' + view + ' .section-rightColumn', true, 0);
        }
        break;

      case 'feed':
        var distance = ($(window).height() - fromTop);

        var velocity = scrollTop - lastScrolled;
        lastScrolled = scrollTop;

        //console.log(elementOffset)

        if (fromTop < -40 && velocity > 0 || fromTop > 76 && velocity < 0) {
          console.log('followOnScroll');
          followOnScroll('#section__' + view + ' .section-rightColumn', fromTop);
        }

        else if (velocity < 0 && fromTop < -40 || velocity > 0 && fromTop > 76) {
          console.log('unfollowOnScroll');
          unfollowOnScroll('#section__' + view + ' .section-rightColumn', false);
        }
        break;
    }
  })
}

/*

The view object updates the html of the page

*/

var view = {
  feed : {
    show: function() {
      mainCtrl.changeView('feed');
      $('#section__feed').find('.card').remove();

      //Let's populate the user's feed
      //
      var feed = firebase.database().ref('users/' + currUser.uid + '/feed');
      feed.on('child_added', function(feedData) {
        var postId = feedData.key;
        var postRef = firebase.database().ref('posts/' + postId);
        postRef.on('value', function(postData) {
          var postVal = postData.val();
          var postId = postData.key;

          var authorName = postVal.author.name;
          var authorPhoto = postVal.author.photoUrl;
          var authorId = postVal.author.id;

          var projectString = '';
          if (postVal.project) {
            var projectId = postVal.project.id;
            var projectName = postVal.project.name;
            projectString = " in <a href=#/project/" + projectId + " class=link>" + projectName + "</a>"
          }

          var postedDate = new Date(postVal.created).toDateString();
          var likes = Object.keys(postVal.likes).length;

          var likeButton = {
            fill:'#ffffff',
            strokeWidth:'2px',
            textColor:'#000000',
          };
          for (var prop in postVal.likes) {
            if (prop == currUser.uid) {
              likeButton = {fill:'#24B3A7', strokeWidth:'0px', textColor:'#24B3A7',};
              break;
            }
          }

          $('#section__feed .section-leftColumn').append('<div class="card feed-post">  \
            <div class="card-reason">  \
              <p class="body">Because !!TODO: PUT REASON WHY THE CARD IS HERE!!</p>  \
            </div>  \
            <div class="card-author">  \
              <div class="card-author-img">  \
                <img src="' + authorPhoto + '" class="profileImg" />  \
              </div>  \
              <div class="card-author-text">  \
                <p class="body"><a href="#/user/' + authorId + '" class="link">' + authorName + '</a>' + projectString + '</p> \
                <p class="body type__secondary">' + postedDate + '</p>  \
              </div>  \
              <div class="card-author-bookmark">  \
                <svg fill="#000000" height="24" viewBox="0 0 24 24" width="24" xm lns="http://www.w3.org/2000/svg"> \
                  <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2 -2-2zm0 15l-5-2.18L7 18V5h10v13z"/> \
                </svg>  \
              </div>  \
            </div>  \
            <a href="#/post/' + postId + '" class="card-content">  \
              <img class="card-content__img" src="assets/placeholder_picture.png " /> \
            </a>  \
            <a href="#/post/' + postId + '" class="card-text">  \
              <h2 class="header">Example of a title goes here.</h2>  \
              <h3 class="subheader type__secondary">Example of a subtitle goes  here.</h3> \
            </a>  \
            <div class="card-action">  \
              <div class="card-action-likes">  \
                <svg stroke="#000000" stroke-width="' + likeButton.strokeWidth + '" fill="' + likeButton.fill + '" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"> \
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/> \
                </svg> \
                <p class="body" style="color:' + likeButton.textColor + '">' + likes + '</p>  \
              </div>  \
              <div class="card-action-discussion">  \
                <p class="body">12 Discussions</p>  \
              </div>  \
            </div>  \
          </div>')

        })
      })
    },

    update: function() {
      console.log('updating feed')
    }
  },

  post : {
    show: function(updateId) {

      mainCtrl.changeView('post');
      var postRef = firebase.database().ref('posts/' + updateId);
      postRef.on('value', function(postData) {
        var postVal = postData.val();

        var authorImg = postVal.author.photoUrl;
        var authorId = postVal.author.id;
        var authorName = postVal.author.name;
        $('#section__post .post-author__img').attr('src', authorImg);
        $('#section__post .post-author-text__name').attr('href', '#/user/' + authorId).text(authorName);

        if (postVal.project) {
          var projectName = postVal.project.name;
          var projectId = postVal.project.id;

          $('.post-author-text__project').find('a').attr('href', '#/project/' + projectId).text(projectName);
        }

        var coverImg = postVal.coverUrl;
        $('.post-cover__img').attr('src', coverImg);
        $('.post-content-main').empty();

        //This is the loop that generates all the DOM for the content
        //
        var content = postVal.content;
        for (var prop in content) {
          switch (content[prop].type) {
            case 'title':
              $('.post-content-main').append('<h2 class="header post-content-main__title">' + content[prop].actual + '</h2>')
              break;
            case 'subline':
              $('.post-content-main').append('<h4 class="subheader type__secondary post-content-main__subheader">' + content[prop].actual + '</h4>')
              break;
            case 'paragraph':
              $('.post-content-main').append('<p class="body__serif post-content-main__body">' + content[prop].actual + '</p>')
              break;
            case 'aside':
              $('.post-content-main').append('<p class="body__serif post-content-main__body post-content-main__italic">' + content[prop].actual + '</p>')
              break;
            case 'image':
              $('.post-content-main').append('<img src="' + content[prop].actual + '" class="post-content-main__img" />')
              break;
            case 'imageLarge':
              $('.post-content-main').append('<img src="' + content[prop].actual + '" class="post-content-main__img post-content-main__imgLarge" />')
              break;
          }
        }
      })
    }
  },

  newPost : {
    show: function() {
      mainCtrl.changeView('newPost');
    }
  },

  profile : {
    show: function() {
      mainCtrl.changeView('profile')
    }
  },

  onboarding: {
    show: function() {
      mainCtrl.changeView('onboarding')
    }
  }
}

var mainCtrl = {
  changeView : function(e) {
    $('.section__active').removeClass('section__active');
    $('#section__' + e).addClass('section__active');

    $('html').attr('data-view', e);
    $('html').attr('class', 'view__' + e);

    //We update the UI
    //
    $('.nav-currentView').removeClass('nav-currentView');
    $('.nav-' + e + 'Indicator').addClass('nav-currentView');
    console.log('.nav-' + e + 'Indicator')

    //Scroll to top to not confuse the user.
    //
    lastScrolled = 0;
    window.scrollTo(0,0);
  },

  pullUpModal: function(e) {
    var modal = '.modal-' + e;
    $('body').addClass('modal__fired');
    $(modal).addClass('modal__active')
    $('body').attr('data-modal', e);
  },

  removeCurrModal: function() {
    var e = $('body').attr('data-modal');

    $('body').removeClass('modal__fired');
    $(modal).removeClass('modal__active')
    $('body').attr('data-modal', '');
  },

  create: {
    post: function() {
      var content = $('.feed-quickpost').find('.feed-quickpost-input-post__editable').html();

    },
  }
}

//Misc Functions
//
function hideLabel(input) {
  var label = $(input).attr('data-label');
  $(label).addClass('hide');
}

function followOnScroll(element, top) {
  var offset = $(element).offset();
  $(element).addClass('fixed').css('left', offset.left).css('top', top);
}

function unfollowOnScroll(element, custom, customTop) {
  if (!custom) {
    var offset = $(element).offset();
    var top = (offset.top - 86);
  }
  else {
    var top = customTop;
  }
  $(element).removeClass('fixed').css('left', '').css('top', top);
}
