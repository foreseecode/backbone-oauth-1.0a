/**
 * Simple pipeline that tests and build `backbone-oauth-1.0a`
 *
 * Deploying is handled differently per branch
 * master - deploys a production version of the component library
 * any other branch - deploys a test package that shouldn't go into production;
 * these packages will be called:
 * backbone-oauth-1.0a@X.X.X-{branch}{date}
 *
 * Test packages will be removed periodically from artifactory
 */
def NODE_VERSION = '12.16.1'

pipeline {
    agent { label 'master||slave1' }
    options {
        // We'll keep the last 10 run of this job around
        buildDiscarder(logRotator(numToKeepStr: '10'))
        // If this takes more than 1 hour, kill this job
        timeout(time: 1, unit: 'HOURS')
        // Adds timestamp to the console log
        timestamps ()
    }
    parameters {
        booleanParam(name: 'DEPLOY', defaultValue: false, description: 'Do you want to deploy a version out of this branch ?')
    }
    stages {
        stage('Preparation') {
            // Cleans up the work directory and clones the reppo
            steps {
                script {
                    // Milestones are used to abort previous jobs if a new change was detected
                    def buildNumber = env.BUILD_NUMBER as int
                    if (buildNumber > 1) milestone(buildNumber - 1)
                    milestone(buildNumber)
                    deleteDir()
                    checkout scm
                    sh "git checkout $BRANCH_NAME"
                }
            }
        }
        stage('Install') {
            // Install all of our dependencies
            steps {
                script {
                    nvm(version: NODE_VERSION) {
                        sh "npm ci --verbose"
                    }
                }
            }
        }
        stage('Test') {
            // Runs tests
            steps {
                script {
                    nvm(version: NODE_VERSION) {
                        sh "npm lint"
                    }
                }
            }
        }
        stage('Version') {
            // If the user has selected to deploy we'll do a version bump
            when {
                expression { params.DEPLOY == true }
            }
            // Here we check for what's the current branch, based on that we'll
            // define if there will be a preid
            environment {
                PRE = sh(returnStdout: true, script: """
                    ENV_NAME=\$(echo "$BRANCH_NAME" | sed -e "s/\\//\\-/")
                    case "\$ENV_NAME" in
                        "master") echo ""
                        ;;
                        *) echo "\$ENV_NAME\$(date +"%Y%m%d%H%M%S")"
                        ;;
                    esac
                """).trim()
            }
            // If we are on master, ask for what kind of version bump
            // if not we'll do a prerelease with the preid
            steps {
                script {
                    nvm(version: NODE_VERSION) {
                            def PRE = " --preid=${env.PRE}"
                            def userInput = "prerelease"
                            if (env.BRANCH_NAME == 'master') {
                                PRE = "";
                                try {
                                    userInput = input(
                                        id: "versionQuest",
                                        message: "Choice:",
                                        parameters: [
                                        [
                                            $class: "ChoiceParameterDefinition",
                                            choices: "patch\nminor\nmajor\nprepatch\npreminor\npremajor\nprerelease",
                                            name: "Version",
                                            description: "Choose your version"
                                        ]
                                    ])
                                } catch(err) {
                                    def user = err.getCauses()[0].getUser()
                                    userInput = "patch"
                                    echo "Aborted by: [${user}]"
                                }
                            }
                            sh "npm version ${userInput}${PRE}"
                    }
                }
            }
            post {
                always {
                    script {
                        currentBuild.description = readJsonFileProperty('package.json', 'version')
                    }
                }
            }
        }
        // Builds the component library
        stage('Build') {
            steps {
                script {
                    nvm(version: NODE_VERSION) {
                        sh "npm run build"
                    }
                }
            }
        }
        stage('Publish to Artifactory') {
            when {
                expression { params.DEPLOY == true }
            }
            steps {
                script {
                    nvm(version: NODE_VERSION) {
                        // NOTE FROM ARTIFACTORY:
                        // We recommend referencing a Virtual Repository URL as a registry. This
                        // gives you the flexibility to reconfigure and aggregate other external
                        // sources and local repositories of npm packages you deployed.
                        //
                        // Note that if you do this, you need to use the --registry parameter to
                        //  specify the local repository into which you are publishing your
                        // package when using the npm publish command.
                        // @see https://www.jfrog.com/confluence/display/RTF/npm+Registry
                        sh "npm publish --registry http://fsr-artifactory.aws.foreseeresults.com/artifactory/api/npm/npm-snapshots/"
                        // We'll only update our reppo with the new version if we are on master
                    }
                }
            }
        }
        // Update our online storybook
        stage('Publish to GitHub') {
            when {
                branch 'master'
                expression { params.DEPLOY == true }
            }
            steps {
                script {
                    nvm(version: NODE_VERSION) {
                        sh "git push origin $BRANCH_NAME"
                    }
                }
            }
        }
    }
}


def readJsonFileProperty(file, property) {
    def text = sh (
        script: "node -e \"console.log(require('./${file}').${property});\"",
        returnStdout: true
    ).trim()
    return text
} 
