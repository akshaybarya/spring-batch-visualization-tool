#!/bin/bash
# Wrapper script to use personal GitHub account SSH key
export GIT_SSH_COMMAND="ssh -i ~/.ssh/akshaybarya -o IdentitiesOnly=yes"
git "$@"
