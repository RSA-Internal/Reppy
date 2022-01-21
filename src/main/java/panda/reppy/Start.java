package panda.reppy;

import panda.reppy.util.Bot;

import javax.security.auth.login.LoginException;

public class Start {

    public static void main(String[] args) throws LoginException, InterruptedException {
        // Instantiate a new bot instance.
        new Bot(args[0]);
    }
}
