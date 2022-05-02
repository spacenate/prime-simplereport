# Developing locally as an external contributor

The Simple Report application uses Okta for user authentication. To run the application locally 
as an external contributor, it is necessary to set up an Okta mirror for the application to use.

## Setting up Okta

1. Create an Okta developer account
    1. Go to https://developer.okta.com/signup/
    2. Fill out the form to create a developer account
2. Acquire an API key
    1. Once logged in, navigate to Security > API
    2. Select the Tokens tab, and click “Create Token”
    3. Copy `.env.sample` to `.env` in the prime-simplereport repo root, if you haven’t already
    4. Update `OKTA_API_KEY` with the new API token value
3. Set up an Application in Okta
    1. Navigate to Applications > Applications
    2. Click “Create App Integration”
        1. Select OpenID Connect as the method
        2. Select Single-Page Application as the type
    3. Configure new integration
        1. Select Implicit (hybrid) as the grant type
        2. Use https://local.simplereport.gov/app as the sign-in redirect URI
        3. Select "Allow everyone in your organization to access" under assignments
4. Update local development configuration
    1. Copy the Client ID and Okta domain from the Application just added in Okta
    2. In backend/src/main/resources/application-okta-local.yaml:
        1. Update `client-id`
        2. Replace 2 instances of `hhs-prime.oktapreview.com` with your newly created Okta domain
    3. In frontend/.env.development:
        1. Update `REACT_APP_OKTA_URL` and `REACT_APP_OKTA_CLIENT_ID`
5. Add custom scopes
    1. Navigate to Security > API
    2. In the Authorization Servers tab, click the "default" auth server to edit it
    3. Click the “Scopes” tab, click “Add Scope”
        1. Use `simple_report` for the name
        2. Click “Create”
    4. Do the same thing to another scope named `simple_report_dev`

At this point, you should be able to run the app and authenticate, but you will not have access to see or do anything.

## Granting Support Admin access

1. Add a Group
    1. Navigate to Directory > Groups
    2. Click “Add Group”, and use `SR-DEV-ADMINS` for the name
    3. Click “Assign People” and add your user, then click Save
    4. Go to the Applications tab, and “Assign applications” to add your Okta Application
2. Expose Groups via Claims
    1. Go to Security > API
    2. In Authorization Servers tab, click the “default” auth server to edit it
    3. In Claims tab, click “Add Claim”
        1. Use `dev_roles` for the name
        2. Include in token type: “Access Token”
        3. Value type: “Groups”
        4. Filter: “Matches regex”, `.*`

## Adding an Organization and Facilities

When adding an organization via https://localhost.simplereport.gov/app/sign-up, do not proceed past
the Identity Verification page (as this will actually attempt to verify the provided identity information). 
Instead, go back to the Support Admin page, and use the “Organizations pending identify verification” 
link to manually verify your new organization.

Once you’ve created an organization, you can use the “Organization data” link to access this organization 
(via your Support-Admin account). After accessing the Organization’s data, you can navigate to 
Settings > Manage facilities to add a facility.

### Address validation

Address validation is required when adding a facility. This is handled via API integration with SmartyStreets.
Either sign up for an account with SmartyStreets (they offer a 30-day free trial) and fill in `SMARTY_AUTH_ID`
/`SMARTY_AUTH_TOKEN` in your local .env, or bypass the query in 
`AddressValidationService::getValidatedAddress(Lookup, String)` with something like the following:

```
--- a/backend/src/main/java/gov/cdc/usds/simplereport/service/AddressValidationService.java
+++ b/backend/src/main/java/gov/cdc/usds/simplereport/service/AddressValidationService.java
@@ -50,37 +50,38 @@ public class AddressValidationService {
   }
 
   public StreetAddress getValidatedAddress(Lookup lookup, String fieldName) {
-    try {
-      _client.send(lookup);
-    } catch (SmartyException | IOException ex) {
-      log.error("SmartyStreets address lookup failed", ex);
-      throw new IllegalGraphqlArgumentException(
-          "The server is unable to verify the address you entered. Please try again later");
-    }
+    // try {
+    //   _client.send(lookup);
+    // } catch (SmartyException | IOException ex) {
+    //   log.error("SmartyStreets address lookup failed", ex);
+    //   throw new IllegalGraphqlArgumentException(
+    //       "The server is unable to verify the address you entered. Please try again later");
+    // }
 
-    ArrayList<Candidate> results = lookup.getResult();
+    // ArrayList<Candidate> results = lookup.getResult();
 
-    if (results.isEmpty()) {
-      return new StreetAddress(
-          lookup.getStreet(),
-          lookup.getSecondary(),
-          lookup.getCity(),
-          lookup.getState(),
-          lookup.getZipCode(),
-          "");
-    }
+    // if (results.isEmpty()) {
+    //   return new StreetAddress(
+    //       lookup.getStreet(),
+    //       lookup.getSecondary(),
+    //       lookup.getCity(),
+    //       lookup.getState(),
+    //       lookup.getZipCode(),
+    //       "");
+    // }
 
-    // If the address is invalid then Smarty street returns 0 results.
-    // If the address is valid the results are returned and the first result is the best match
-    // and is the one we should be using to get the County metadata
-    Candidate addressMatch = results.get(0);
+    // // If the address is invalid then Smarty street returns 0 results.
+    // // If the address is valid the results are returned and the first result is the best match
+    // // and is the one we should be using to get the County metadata
+    // Candidate addressMatch = results.get(0);
     return new StreetAddress(
         lookup.getStreet(),
         lookup.getSecondary(),
         lookup.getCity(),
         lookup.getState(),
         lookup.getZipCode(),
-        addressMatch.getMetadata().getCountyName());
+        // addressMatch.getMetadata().getCountyName());
+        "District of Columbia");
   }
 
   /** Returns a StreetAddress if the address is valid and throws an exception if it is not */
```