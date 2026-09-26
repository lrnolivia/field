# field Codex/local installer package

This package format belongs to the Codex/local-repository lane, or to an assignment that explicitly authorizes a local installer.

It is not the default Contract Worker execution path.

The established package UX remains:

    cd ~/Downloads || exit 1
    unzip -o <PACKAGE>.zip
    cd <PACKAGE> || exit 1

    chmod +x install-build-commit-push.sh
    ./install-build-commit-push.sh

Canonical kit:
https://github.com/lrnolivia/field/tree/main/.field/handoff-kit

Contract Workers instead use field/control, field/<assignment-id>, a Draft PR, and Composio-exclusive GitHub transport.

A Contract Worker installer, if explicitly required by its assignment, must target the assignment branch and leave merge as a separate operation.

Do not manually copy helper files into the field repository.
